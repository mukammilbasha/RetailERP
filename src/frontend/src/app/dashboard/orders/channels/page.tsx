"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ShoppingCart,
  Globe,
  Store,
  Users,
  Plus,
  Trash2,
  Package,
  Search,
  ChevronDown,
  Save,
  CheckCircle,
  AlertTriangle,
  FileText,
  Truck,
  Eye,
  Edit2,
  X,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

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
  storeName: string;
  channel: string;
  totalLines: number;
  totalQuantity: number;
  totalAmount: number;
  status: "Draft" | "Confirmed" | "Cancelled" | "Dispatched";
  notes?: string;
}

interface ChannelSizeEntry {
  label: string;
  euroSize: number;
  ukSize: string;
  openingStock: number;
  orderQty: number;
  closingStock: number;
}

interface ChannelArticleEntry {
  localId: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  color: string;
  hsnCode: string;
  mrp: number;
  sizeData: ChannelSizeEntry[];
  loadingStock: boolean;
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
}

interface ChannelStats {
  totalOrders: number;
  totalQty: number;
  totalValue: number;
}

/* ================================================================
   CONSTANTS
   ================================================================ */

const SIZE_RUN: ChannelSizeEntry[] = [
  { label: "39-05",   euroSize: 39, ukSize: "05",   openingStock: 0, orderQty: 0, closingStock: 0 },
  { label: "39-6.5",  euroSize: 39, ukSize: "6.5",  openingStock: 0, orderQty: 0, closingStock: 0 },
  { label: "40-07",   euroSize: 40, ukSize: "07",   openingStock: 0, orderQty: 0, closingStock: 0 },
  { label: "40-7.5",  euroSize: 40, ukSize: "7.5",  openingStock: 0, orderQty: 0, closingStock: 0 },
  { label: "41-08",   euroSize: 41, ukSize: "08",   openingStock: 0, orderQty: 0, closingStock: 0 },
  { label: "41-8.5",  euroSize: 41, ukSize: "8.5",  openingStock: 0, orderQty: 0, closingStock: 0 },
  { label: "42-09",   euroSize: 42, ukSize: "09",   openingStock: 0, orderQty: 0, closingStock: 0 },
  { label: "42-9.5",  euroSize: 42, ukSize: "9.5",  openingStock: 0, orderQty: 0, closingStock: 0 },
  { label: "43-10",   euroSize: 43, ukSize: "10",   openingStock: 0, orderQty: 0, closingStock: 0 },
  { label: "43-10.5", euroSize: 43, ukSize: "10.5", openingStock: 0, orderQty: 0, closingStock: 0 },
  { label: "44-11",   euroSize: 44, ukSize: "11",   openingStock: 0, orderQty: 0, closingStock: 0 },
  { label: "45-12",   euroSize: 45, ukSize: "12",   openingStock: 0, orderQty: 0, closingStock: 0 },
];

const CHANNELS = ["Website", "Secondary", "Offline", "Direct"] as const;
type ChannelType = (typeof CHANNELS)[number];

const TABS = ["All Orders", "Website Sales", "Secondary Sales", "Offline Sales"] as const;
type TabType = (typeof TABS)[number];

const TAB_CHANNEL_MAP: Record<TabType, ChannelType | undefined> = {
  "All Orders":       undefined,
  "Website Sales":    "Website",
  "Secondary Sales":  "Secondary",
  "Offline Sales":    "Offline",
};

const TAB_ICONS: Record<TabType, React.ReactNode> = {
  "All Orders":      <ShoppingCart size={14} />,
  "Website Sales":   <Globe size={14} />,
  "Secondary Sales": <Users size={14} />,
  "Offline Sales":   <Store size={14} />,
};

const CHANNEL_BADGE_STYLES: Record<string, string> = {
  Website:   "bg-blue-100 text-blue-700 border-blue-200",
  Secondary: "bg-purple-100 text-purple-700 border-purple-200",
  Offline:   "bg-orange-100 text-orange-700 border-orange-200",
  Direct:    "bg-green-100 text-green-700 border-green-200",
};

const STATUS_FILTER_OPTIONS = ["All", "Draft", "Confirmed", "Cancelled", "Dispatched"];

const inputCls =
  "w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background";

/* ================================================================
   HELPERS
   ================================================================ */

function buildFreshSizeData(): ChannelSizeEntry[] {
  return SIZE_RUN.map((s) => ({ ...s }));
}

/** Merge API stock response into a fresh size data array.
 *  The API returns sizes keyed by euroSize; we aggregate by euroSize
 *  across the 12 half-size slots. */
function mergeStockIntoSizeData(
  sizeData: ChannelSizeEntry[],
  apiSizes: { euroSize: number; openingStock?: number; closingStock?: number }[]
): ChannelSizeEntry[] {
  // Build a map: euroSize -> summed openingStock
  const stockMap = new Map<number, number>();
  for (const s of apiSizes) {
    const prev = stockMap.get(s.euroSize) ?? 0;
    stockMap.set(s.euroSize, prev + (s.openingStock ?? 0));
  }
  return sizeData.map((entry) => {
    // Split stock evenly across both slots of the same euroSize
    const slotsForEuro = sizeData.filter((e) => e.euroSize === entry.euroSize).length;
    const totalStock = stockMap.get(entry.euroSize) ?? 0;
    const openingStock = slotsForEuro > 1 ? Math.floor(totalStock / slotsForEuro) : totalStock;
    return {
      ...entry,
      openingStock,
      closingStock: openingStock - entry.orderQty,
    };
  });
}

/* ================================================================
   CHANNEL BADGE
   ================================================================ */

function ChannelBadge({ channel }: { channel: string }) {
  const style = CHANNEL_BADGE_STYLES[channel] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {channel}
    </span>
  );
}

/* ================================================================
   STAT CARD
   ================================================================ */

function StatCard({
  label,
  value,
  icon,
  colorClass,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${colorClass}`}>
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/60 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

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
        type="button"
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
          <div className="absolute top-full left-0 mt-1 w-full min-w-[320px] bg-card border rounded-xl shadow-xl z-40 max-h-72 overflow-hidden">
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
                    type="button"
                    onClick={() => {
                      onSelect(article);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
                        {article.articleCode}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {article.articleName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      {article.color && (
                        <span className="text-xs text-muted-foreground">
                          {article.color}
                        </span>
                      )}
                      <span className="text-xs font-semibold">
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
   CHANNEL SIZE RUN CARD
   ================================================================ */

function ChannelSizeRunCard({
  entry,
  onQuantityChange,
  onRemove,
  readOnly,
}: {
  entry: ChannelArticleEntry;
  onQuantityChange: (localId: string, sizeIndex: number, qty: number) => void;
  onRemove: (localId: string) => void;
  readOnly?: boolean;
}) {
  const totalOpeningStock = entry.sizeData.reduce((sum, s) => sum + s.openingStock, 0);
  const totalOrderQty = entry.sizeData.reduce((sum, s) => sum + s.orderQty, 0);
  const totalClosingStock = entry.sizeData.reduce(
    (sum, s) => sum + (s.openingStock - s.orderQty),
    0
  );
  const totalAmount = totalOrderQty * entry.mrp;
  const hasExceeded = entry.sizeData.some(
    (s) => s.orderQty > 0 && s.orderQty > s.openingStock
  );

  return (
    <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-muted/40 border-b">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-md font-bold">
            {entry.articleCode}
          </span>
          <span className="text-sm font-semibold">{entry.articleName}</span>
          {entry.color && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              {entry.color}
            </span>
          )}
          {entry.hsnCode && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
              HSN: {entry.hsnCode}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground font-medium">
            MRP:{" "}
            <span className="text-foreground font-semibold">
              {formatCurrency(entry.mrp)}
            </span>
          </span>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onRemove(entry.localId)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
              title="Remove article"
            >
              <Trash2 size={16} className="text-destructive" />
            </button>
          )}
        </div>
      </div>

      {/* Size Run Table Title */}
      <div className="text-center py-2 bg-muted/20 border-b">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Size Run Chart &mdash; Channel Order Entry
        </p>
      </div>

      {/* Loading state */}
      {entry.loadingStock ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          Loading stock positions...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-3 py-2 text-left font-bold text-primary border-r border-border/50 w-32 whitespace-nowrap">
                  SIZE
                </th>
                {entry.sizeData.map((s, idx) => (
                  <th
                    key={idx}
                    className="px-2 py-2 text-center font-bold text-primary border-r border-border/50 whitespace-nowrap min-w-[58px]"
                  >
                    {s.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-bold text-primary whitespace-nowrap w-16">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              {/* OPENING STOCK Row */}
              <tr className="border-b border-border/30 bg-green-50/60">
                <td className="px-3 py-1.5 font-semibold text-green-700 border-r border-border/50">
                  OPENING STOCK
                </td>
                {entry.sizeData.map((s, idx) => (
                  <td
                    key={idx}
                    className="px-2 py-1.5 text-center border-r border-border/50 font-medium text-green-700"
                  >
                    {s.openingStock}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-center font-bold text-green-700">
                  {totalOpeningStock}
                </td>
              </tr>

              {/* ORDER QTY Row (editable, amber) */}
              <tr className="border-b border-border/30">
                <td className="px-3 py-2 font-bold text-foreground border-r border-border/50 bg-amber-50 whitespace-nowrap">
                  ORDER QTY
                </td>
                {entry.sizeData.map((s, idx) => {
                  const exceeded = s.orderQty > 0 && s.orderQty > s.openingStock;
                  return (
                    <td
                      key={idx}
                      className="px-1 py-1.5 text-center border-r border-border/50 bg-amber-50"
                    >
                      {readOnly ? (
                        <span
                          className={`font-bold ${exceeded ? "text-red-700" : "text-foreground"}`}
                        >
                          {s.orderQty || 0}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={s.orderQty || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            onQuantityChange(entry.localId, idx, val < 0 ? 0 : val);
                          }}
                          className={`w-full px-1 py-1.5 text-center text-sm font-bold rounded focus:outline-none focus:ring-2 ${
                            exceeded
                              ? "bg-red-100 border-2 border-red-400 text-red-700 focus:ring-red-400 focus:border-red-400"
                              : "bg-amber-100 border border-amber-300 focus:ring-amber-400 focus:border-amber-400"
                          }`}
                          placeholder="0"
                        />
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 text-center font-bold text-base bg-amber-50">
                  {totalOrderQty}
                </td>
              </tr>

              {/* CLOSING STOCK Row */}
              <tr>
                <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50 bg-blue-50/50 whitespace-nowrap">
                  CLOSING STOCK
                </td>
                {entry.sizeData.map((s, idx) => {
                  const closing = s.openingStock - s.orderQty;
                  return (
                    <td
                      key={idx}
                      className={`px-2 py-1.5 text-center border-r border-border/50 font-medium bg-blue-50/50 ${
                        closing < 0 ? "text-red-600 font-bold" : "text-blue-700"
                      }`}
                    >
                      {closing}
                    </td>
                  );
                })}
                <td
                  className={`px-3 py-1.5 text-center font-bold bg-blue-50/50 ${
                    totalClosingStock < 0 ? "text-red-600" : "text-blue-700"
                  }`}
                >
                  {totalClosingStock}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Card Footer */}
      <div className="flex items-center justify-between px-5 py-3 bg-muted/20 border-t">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Package size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Total Pairs:{" "}
              <span className="font-bold text-foreground text-base">
                {totalOrderQty}
              </span>
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            Amount:{" "}
            <span className="font-bold text-foreground text-base">
              {formatCurrency(totalAmount)}
            </span>
          </span>
        </div>
        {hasExceeded && (
          <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
            <AlertTriangle size={14} />
            Order qty exceeds available stock
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */

export default function SalesChannelsPage() {
  /* ---- Tab & List state ---- */
  const [activeTab, setActiveTab] = useState<TabType>("All Orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ChannelStats>({
    totalOrders: 0,
    totalQty: 0,
    totalValue: 0,
  });

  /* ---- Order form modal ---- */
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  /* ---- Form header state ---- */
  const [formOrderDate, setFormOrderDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formClientId, setFormClientId] = useState("");
  const [formStoreId, setFormStoreId] = useState("");
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [formChannel, setFormChannel] = useState<string>("Website");
  const [formNotes, setFormNotes] = useState("");

  /* ---- Article entries ---- */
  const [articleEntries, setArticleEntries] = useState<ChannelArticleEntry[]>([]);

  /* ---- Reference data ---- */
  const [clients, setClients] = useState<DropdownItem[]>([]);
  const [stores, setStores] = useState<DropdownItem[]>([]);
  const [warehouses, setWarehouses] = useState<DropdownItem[]>([]);
  const [availableArticles, setAvailableArticles] = useState<ArticleOption[]>([]);

  /* ---- Stock cache ---- */
  const stockCacheRef = useRef<Map<string, { euroSize: number; openingStock: number }[]>>(
    new Map()
  );
  const lastWarehouseIdRef = useRef("");

  /* ---- UI state ---- */
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { showToast } = useToast();
  const { confirm: confirmDialog } = useConfirm();

  /* ---- Invoice modal state ---- */
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [invoiceOrderDetail, setInvoiceOrderDetail] = useState<any>(null);
  const [invDate, setInvDate] = useState(new Date().toISOString().split("T")[0]);
  const [invMarginPct, setInvMarginPct] = useState("0");
  const [invPoNumber, setInvPoNumber] = useState("");
  const [invPoDate, setInvPoDate] = useState("");
  const [invIsInterState, setInvIsInterState] = useState(false);
  const [invCartonBoxes, setInvCartonBoxes] = useState("1");
  const [invLogistic, setInvLogistic] = useState("");
  const [invTransportMode, setInvTransportMode] = useState("Road");
  const [invVehicleNo, setInvVehicleNo] = useState("");
  const [invNotes, setInvNotes] = useState("");
  const [invCreating, setInvCreating] = useState(false);

  /* ================================================================
     DATA FETCHING
     ================================================================ */

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const channel = TAB_CHANNEL_MAP[activeTab];
      const { data } = await api.get<ApiResponse<any>>("/api/orders", {
        params: {
          search: search || undefined,
          status: statusFilter !== "All" ? statusFilter : undefined,
          channel: channel || undefined,
          page,
          pageSize: 25,
        },
      });
      if (data.success) {
        const items: Order[] = (data.data?.items || data.data || []).map((o: any) => ({
          orderId:       o.orderId,
          orderNo:       o.orderNo,
          orderDate:     o.orderDate,
          clientId:      o.clientId,
          clientName:    o.clientName || "",
          storeId:       o.storeId,
          storeName:     o.storeName || "",
          channel:       o.channel || o.salesChannel || "-",
          totalLines:    o.totalLines || o.articlesCount || 0,
          totalQuantity: o.totalQuantity || 0,
          totalAmount:   o.totalAmount || o.totalValue || 0,
          status:        o.status,
          notes:         o.notes,
        }));
        setOrders(items);
        setTotalCount(data.data?.totalCount || items.length);

        // Compute stats from page items (full stats would require separate API)
        const computed = items.reduce(
          (acc, o) => {
            acc.totalQty += o.totalQuantity;
            acc.totalValue += o.totalAmount;
            return acc;
          },
          { totalQty: 0, totalValue: 0 }
        );
        setStats({
          totalOrders: data.data?.totalCount || items.length,
          totalQty: computed.totalQty,
          totalValue: computed.totalValue,
        });
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, activeTab]);

  const fetchDropdowns = useCallback(async () => {
    try {
      const [clientRes, articleRes, warehouseRes] = await Promise.all([
        api.get<ApiResponse<any>>("/api/clients", { params: { pageSize: 200 } }),
        api.get<ApiResponse<any>>("/api/articles", { params: { pageSize: 500 } }),
        api.get<ApiResponse<any>>("/api/warehouses", { params: { pageSize: 200 } }),
      ]);
      if (clientRes.data.success) {
        const items = clientRes.data.data?.items || clientRes.data.data || [];
        setClients(items.map((c: any) => ({ id: c.clientId, name: c.clientName })));
      }
      if (articleRes.data.success) {
        const items = articleRes.data.data?.items || articleRes.data.data || [];
        setAvailableArticles(
          items.map((a: any) => ({
            articleId:   a.articleId,
            articleCode: a.articleCode,
            articleName: a.articleName,
            color:       a.color || a.colour || "",
            hsnCode:     a.hsnCode || "",
            mrp:         a.mrp || 0,
          }))
        );
      }
      if (warehouseRes.data.success) {
        const items = warehouseRes.data.data?.items || warehouseRes.data.data || [];
        setWarehouses(
          items.map((w: any) => ({ id: w.warehouseId, name: w.warehouseName }))
        );
      }
    } catch {
      /* silent */
    }
  }, []);

  const fetchStores = useCallback(async (clientId: string) => {
    try {
      const { data } = await api.get<ApiResponse<any>>(`/api/clients/${clientId}/stores`, {
        params: { pageSize: 200 },
      });
      if (data.success) {
        const items = data.data?.items || data.data || [];
        setStores(
          items.map((s: any) => ({
            id:   s.storeId,
            name: s.storeName,
            code: s.storeCode || s.storeName,
          }))
        );
      }
    } catch {
      // Fallback: try generic stores endpoint filtered by clientId
      try {
        const { data } = await api.get<ApiResponse<any>>("/api/stores", {
          params: { clientId, pageSize: 200 },
        });
        if (data.success) {
          const items = data.data?.items || data.data || [];
          setStores(
            items.map((s: any) => ({
              id:   s.storeId,
              name: s.storeName,
              code: s.storeCode || s.storeName,
            }))
          );
        }
      } catch {
        setStores([]);
      }
    }
  }, []);

  /** Fetch stock for a single article from the given warehouse.
   *  Returns an array of { euroSize, openingStock } objects. */
  const fetchArticleStock = useCallback(
    async (
      warehouseId: string,
      articleId: string
    ): Promise<{ euroSize: number; openingStock: number }[]> => {
      if (!warehouseId) return [];
      const cacheKey = `${warehouseId}::${articleId}`;
      if (stockCacheRef.current.has(cacheKey)) {
        return stockCacheRef.current.get(cacheKey)!;
      }
      try {
        const { data } = await api.get<ApiResponse<any>>(
          `/api/stock/${warehouseId}/${articleId}`
        );
        if (data.success && data.data) {
          const sizes = data.data.sizes || data.data.sizeStocks || [];
          const result = sizes.map((s: any) => ({
            euroSize:     s.euroSize || s.size || 0,
            openingStock: s.openingStock ?? s.quantity ?? s.stock ?? 0,
          }));
          stockCacheRef.current.set(cacheKey, result);
          return result;
        }
      } catch {
        /* fall through */
      }
      return [];
    },
    []
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
      setFormStoreId("");
    }
  }, [formClientId, fetchStores]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, statusFilter]);

  /* ================================================================
     ARTICLE MANAGEMENT
     ================================================================ */

  const handleAddArticle = useCallback(
    async (article: ArticleOption) => {
      const localId = `${article.articleId}-${Date.now()}`;
      // Add immediately with loading state
      const newEntry: ChannelArticleEntry = {
        localId,
        articleId:   article.articleId,
        articleCode: article.articleCode,
        articleName: article.articleName,
        color:       article.color,
        hsnCode:     article.hsnCode,
        mrp:         article.mrp,
        sizeData:    buildFreshSizeData(),
        loadingStock: !!formWarehouseId,
      };
      setArticleEntries((prev) => [...prev, newEntry]);

      // Fetch stock if warehouse is selected
      if (formWarehouseId) {
        const apiSizes = await fetchArticleStock(formWarehouseId, article.articleId);
        setArticleEntries((prev) =>
          prev.map((e) =>
            e.localId !== localId
              ? e
              : {
                  ...e,
                  loadingStock: false,
                  sizeData: mergeStockIntoSizeData(e.sizeData, apiSizes),
                }
          )
        );
      }
    },
    [formWarehouseId, fetchArticleStock]
  );

  const handleRemoveArticle = useCallback((localId: string) => {
    setArticleEntries((prev) => prev.filter((e) => e.localId !== localId));
  }, []);

  const handleQuantityChange = useCallback(
    (localId: string, sizeIndex: number, qty: number) => {
      setArticleEntries((prev) =>
        prev.map((entry) => {
          if (entry.localId !== localId) return entry;
          const newSizes = [...entry.sizeData];
          newSizes[sizeIndex] = {
            ...newSizes[sizeIndex],
            orderQty:     qty,
            closingStock: newSizes[sizeIndex].openingStock - qty,
          };
          return { ...entry, sizeData: newSizes };
        })
      );
    },
    []
  );

  /** When warehouse changes, re-fetch stock for all existing articles */
  const handleWarehouseChange = useCallback(
    async (warehouseId: string) => {
      setFormWarehouseId(warehouseId);
      if (warehouseId === lastWarehouseIdRef.current) return;
      lastWarehouseIdRef.current = warehouseId;
      // Invalidate cache entries for other warehouses
      stockCacheRef.current.clear();

      if (!warehouseId || articleEntries.length === 0) return;

      // Mark all entries as loading
      setArticleEntries((prev) =>
        prev.map((e) => ({ ...e, loadingStock: true }))
      );

      const updated = await Promise.all(
        articleEntries.map(async (entry) => {
          const apiSizes = await fetchArticleStock(warehouseId, entry.articleId);
          return {
            ...entry,
            loadingStock: false,
            sizeData: mergeStockIntoSizeData(entry.sizeData, apiSizes),
          };
        })
      );
      setArticleEntries(updated);
    },
    [articleEntries, fetchArticleStock]
  );

  /* ================================================================
     COMPUTED VALUES
     ================================================================ */

  const grandTotals = useMemo(() => {
    let totalArticles = articleEntries.length;
    let totalPairs = 0;
    let totalAmount = 0;
    for (const entry of articleEntries) {
      const entryQty = entry.sizeData.reduce((sum, s) => sum + s.orderQty, 0);
      totalPairs += entryQty;
      totalAmount += entryQty * entry.mrp;
    }
    return { totalArticles, totalPairs, totalAmount };
  }, [articleEntries]);

  const hasStockValidationErrors = useMemo(
    () =>
      articleEntries.some((entry) =>
        entry.sizeData.some((s) => s.orderQty > 0 && s.orderQty > s.openingStock)
      ),
    [articleEntries]
  );

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
    setFormOrderDate(new Date().toISOString().split("T")[0]);
    setFormClientId("");
    setFormStoreId("");
    setFormWarehouseId("");
    setFormChannel(TAB_CHANNEL_MAP[activeTab] || "Website");
    setFormNotes("");
    setArticleEntries([]);
    stockCacheRef.current.clear();
    lastWarehouseIdRef.current = "";
  }, [activeTab]);

  /** Build POST/PUT payload matching the backend contract */
  const buildPayload = useCallback(() => {
    return {
      clientId:    formClientId,
      storeId:     formStoreId,
      warehouseId: formWarehouseId || undefined,
      orderDate:   formOrderDate,
      channel:     formChannel,
      notes:       formNotes || undefined,
      articles:    articleEntries.map((entry) => ({
        articleId: entry.articleId,
        color:     entry.color,
        hsnCode:   entry.hsnCode,
        mrp:       entry.mrp,
        sizeQuantities: entry.sizeData
          .filter((s) => s.orderQty > 0)
          .map((s) => ({
            euroSize: s.euroSize,
            quantity: s.orderQty,
          })),
      })),
    };
  }, [
    formClientId,
    formStoreId,
    formWarehouseId,
    formOrderDate,
    formChannel,
    formNotes,
    articleEntries,
  ]);

  /* ================================================================
     CRUD OPERATIONS
     ================================================================ */

  const openAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = async (order: Order) => {
    resetForm();
    setEditingOrder(order);
    setFormOrderDate(
      order.orderDate
        ? new Date(order.orderDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setFormClientId(order.clientId || "");
    setFormStoreId(order.storeId || "");
    setFormChannel(order.channel || "Website");

    try {
      const { data } = await api.get<ApiResponse<any>>(`/api/orders/${order.orderId}`);
      if (data.success && data.data) {
        const detail = data.data;
        setFormClientId(detail.clientId || order.clientId || "");
        setFormStoreId(detail.storeId || order.storeId || "");
        setFormWarehouseId(detail.warehouseId || "");
        setFormChannel(detail.channel || order.channel || "Website");
        setFormNotes(detail.notes || "");

        const warehouseId = detail.warehouseId || "";
        if (warehouseId) lastWarehouseIdRef.current = warehouseId;

        const rawArticles = detail.articles || detail.lines || [];
        if (rawArticles.length > 0) {
          // Build entries with loading state then fetch stock
          const initialEntries: ChannelArticleEntry[] = rawArticles.map(
            (a: any, i: number) => ({
              localId:     `${a.articleId}-${Date.now()}-${i}`,
              articleId:   a.articleId,
              articleCode: a.articleCode || "",
              articleName: a.articleName || "",
              color:       a.color || a.colour || "",
              hsnCode:     a.hsnCode || "",
              mrp:         a.mrp || 0,
              sizeData:    buildFreshSizeData(),
              loadingStock: !!warehouseId,
            })
          );
          setArticleEntries(initialEntries);

          const updatedEntries = await Promise.all(
            rawArticles.map(async (a: any, i: number) => {
              const sizeQties: any[] = a.sizeQuantities || a.sizes || [];
              let apiSizes: { euroSize: number; openingStock: number }[] = [];
              if (warehouseId) {
                apiSizes = await fetchArticleStock(warehouseId, a.articleId);
              }
              const freshSizes = buildFreshSizeData();
              const withStock = mergeStockIntoSizeData(freshSizes, apiSizes);
              // Overlay saved order quantities
              const finalSizes = withStock.map((slot) => {
                const match = sizeQties.find(
                  (sq: any) =>
                    sq.euroSize === slot.euroSize ||
                    String(sq.euroSize) === String(slot.euroSize)
                );
                const orderQty = match?.quantity ?? match?.orderQty ?? match?.qty ?? 0;
                return {
                  ...slot,
                  orderQty,
                  closingStock: slot.openingStock - orderQty,
                };
              });
              return {
                localId:     initialEntries[i].localId,
                articleId:   a.articleId,
                articleCode: a.articleCode || "",
                articleName: a.articleName || "",
                color:       a.color || a.colour || "",
                hsnCode:     a.hsnCode || "",
                mrp:         a.mrp || 0,
                sizeData:    finalSizes,
                loadingStock: false,
              };
            })
          );
          setArticleEntries(updatedEntries);
        }
      }
    } catch {
      /* fallback: basic info already set */
    }

    setModalOpen(true);
  };

  const openView = async (order: Order) => {
    await openEdit(order);
    setViewMode(true);
  };

  const handleSaveDraft = async () => {
    if (!formClientId || !formStoreId) {
      showToast("error", "Validation Error", "Client and Store are required.");
      return;
    }
    if (articleEntries.length === 0) {
      showToast("error", "Validation Error", "Add at least one article with quantities.");
      return;
    }
    setSaving(true);
    try {
      const body = buildPayload();
      if (editingOrder) {
        await api.put(`/api/orders/${editingOrder.orderId}`, body);
        showToast("success", "Order Updated", "The order draft has been updated.");
      } else {
        await api.post("/api/orders", body);
        showToast("success", "Order Created", "A new order draft has been created.");
      }
      setModalOpen(false);
      resetForm();
      fetchOrders();
    } catch (err: any) {
      showToast(
        "error",
        "Failed to Save",
        err.response?.data?.message || "An error occurred."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!formClientId || !formStoreId) {
      showToast("error", "Validation Error", "Client and Store are required.");
      return;
    }
    if (articleEntries.length === 0) {
      showToast("error", "Validation Error", "Add at least one article with quantities.");
      return;
    }
    if (grandTotals.totalPairs <= 0) {
      showToast("error", "Validation Error", "Total quantity must be greater than zero.");
      return;
    }
    setConfirming(true);
    try {
      let orderId = editingOrder?.orderId;
      const body = buildPayload();
      if (!orderId) {
        const { data } = await api.post<ApiResponse<any>>("/api/orders", body);
        if (data.success && data.data) {
          orderId = data.data.orderId || data.data.id;
        } else {
          throw new Error(data.message || "Failed to create order");
        }
      } else {
        await api.put(`/api/orders/${orderId}`, body);
      }
      await api.put(`/api/orders/${orderId}/confirm`);
      showToast(
        "success",
        "Order Confirmed",
        "The order has been confirmed."
      );
      setModalOpen(false);
      resetForm();
      fetchOrders();
    } catch (err: any) {
      showToast(
        "error",
        "Failed to Confirm",
        err.response?.data?.message || err.message || "An error occurred."
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = async (order: Order) => {
    if (order.status !== "Draft") {
      showToast("error", "Cannot Delete", "Only draft orders can be deleted.");
      return;
    }
    const confirmed = await confirmDialog({
      title:        "Delete Order",
      message:      `Are you sure you want to delete "${order.orderNo}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant:      "danger",
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/orders/${order.orderId}`);
      showToast("success", "Deleted", `"${order.orderNo}" has been removed.`);
      fetchOrders();
    } catch (err: any) {
      showToast(
        "error",
        "Failed to Delete",
        err.response?.data?.message || "An error occurred."
      );
    }
  };

  const handleConfirmFromList = async (order: Order) => {
    const confirmed = await confirmDialog({
      title:        "Confirm Order",
      message:      `Confirm order "${order.orderNo}"? This cannot be undone.`,
      confirmLabel: "Confirm",
      variant:      "danger",
    });
    if (!confirmed) return;
    try {
      await api.put(`/api/orders/${order.orderId}/confirm`);
      showToast("success", "Order Confirmed", `"${order.orderNo}" has been confirmed.`);
      fetchOrders();
    } catch (err: any) {
      showToast(
        "error",
        "Failed to Confirm",
        err.response?.data?.message || "An error occurred."
      );
    }
  };

  const handleCancelFromList = async (order: Order) => {
    const confirmed = await confirmDialog({
      title:        "Cancel Order",
      message:      `Are you sure you want to cancel "${order.orderNo}"? This action cannot be undone.`,
      confirmLabel: "Cancel Order",
      variant:      "danger",
    });
    if (!confirmed) return;
    try {
      await api.put(`/api/orders/${order.orderId}/cancel`);
      showToast("success", "Order Cancelled", `"${order.orderNo}" has been cancelled.`);
      fetchOrders();
    } catch (err: any) {
      showToast(
        "error",
        "Failed to Cancel",
        err.response?.data?.message || "An error occurred."
      );
    }
  };

  const handleDispatchFromList = async (order: Order) => {
    const ok = await confirmDialog({
      title:        "Dispatch Order",
      message:      `Dispatch order "${order.orderNo}"? This will mark it as dispatched.`,
      confirmLabel: "Dispatch",
      variant:      "danger",
    });
    if (!ok) return;
    try {
      await api.put(`/api/orders/${order.orderId}/dispatch`);
      showToast("success", "Order Dispatched", `"${order.orderNo}" has been dispatched.`);
      fetchOrders();
    } catch (err: any) {
      showToast(
        "error",
        "Failed to Dispatch",
        err.response?.data?.message || "An error occurred."
      );
    }
  };

  const openInvoiceModal = async (order: Order) => {
    setInvoiceOrder(order);
    setInvDate(new Date().toISOString().split("T")[0]);
    setInvMarginPct("0");
    setInvPoNumber("");
    setInvPoDate("");
    setInvIsInterState(false);
    setInvCartonBoxes("1");
    setInvLogistic("");
    setInvTransportMode("Road");
    setInvVehicleNo("");
    setInvNotes("");
    setInvoiceOrderDetail(null);
    try {
      const { data } = await api.get<ApiResponse<any>>(`/api/orders/${order.orderId}`);
      if (data.success) setInvoiceOrderDetail(data.data);
    } catch {
      /* use basic info */
    }
    setInvoiceModalOpen(true);
  };

  const handleCreateInvoice = async () => {
    if (!invoiceOrder) return;
    setInvCreating(true);
    try {
      const detail = invoiceOrderDetail;
      const marginPct = parseFloat(invMarginPct) || 0;
      const rawArticles = detail?.articles || detail?.lines || [];
      const lines = rawArticles.map((a: any) => {
        const sizeQties: Record<string, number> = {};
        const sizes = a.sizeQuantities || a.sizes || [];
        for (const s of sizes) {
          const euroSize = s.euroSize || s.size;
          if (euroSize && (s.quantity || s.qty || s.orderQty)) {
            sizeQties[String(euroSize)] = s.quantity || s.qty || s.orderQty || 0;
          }
        }
        return {
          articleId:         a.articleId,
          sku:               a.articleCode || a.sku || "",
          articleName:       a.articleName || a.description || "",
          description:       a.articleName || "",
          hsnCode:           a.hsnCode || "",
          color:             a.color || a.colour || "",
          mrp:               a.mrp || 0,
          quantity:          a.quantity || a.totalQuantity || 0,
          marginPercent:     marginPct,
          sizeBreakdownJson: JSON.stringify(sizeQties),
          uom:               "Pairs",
        };
      });
      const payload = {
        orderId:       invoiceOrder.orderId,
        orderNumber:   invoiceOrder.orderNo,
        clientId:      invoiceOrder.clientId,
        storeId:       invoiceOrder.storeId,
        invoiceDate:   invDate,
        isInterState:  invIsInterState,
        poNumber:      invPoNumber || undefined,
        poDate:        invPoDate || undefined,
        cartonBoxes:   parseInt(invCartonBoxes) || 1,
        logistic:      invLogistic || undefined,
        transportMode: invTransportMode || undefined,
        vehicleNo:     invVehicleNo || undefined,
        notes:         invNotes || undefined,
        lines,
      };
      await api.post("/api/invoices", payload);
      showToast(
        "success",
        "Invoice Created",
        `Invoice generated for order ${invoiceOrder.orderNo}.`
      );
      setInvoiceModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      showToast(
        "error",
        "Failed to Create Invoice",
        err.response?.data?.message || "An error occurred."
      );
    } finally {
      setInvCreating(false);
    }
  };

  /* ================================================================
     TABLE COLUMNS
     ================================================================ */

  const columns: Column<Order>[] = [
    {
      key:       "orderNo",
      header:    "Order No",
      className: "font-mono text-xs font-medium whitespace-nowrap",
    },
    {
      key:    "orderDate",
      header: "Date",
      render: (o) => formatDate(o.orderDate),
    },
    { key: "clientName", header: "Client" },
    { key: "storeName",  header: "Store" },
    {
      key:    "channel",
      header: "Channel",
      render: (o) => <ChannelBadge channel={o.channel} />,
    },
    {
      key:       "totalLines",
      header:    "Articles",
      className: "text-center",
      render:    (o) => (
        <span className="inline-flex items-center justify-center bg-primary/10 text-primary font-semibold text-xs rounded-full w-7 h-7">
          {o.totalLines || 0}
        </span>
      ),
    },
    {
      key:       "totalQuantity",
      header:    "Total Qty",
      className: "text-right font-medium",
      render:    (o) => <span className="font-semibold">{o.totalQuantity}</span>,
    },
    {
      key:       "totalAmount",
      header:    "Total Amount",
      className: "text-right font-medium",
      render:    (o) => formatCurrency(o.totalAmount),
    },
    {
      key:    "status",
      header: "Status",
      render: (o) => {
        const statusMap: Record<string, string> = {
          Draft:      "DRAFT",
          Confirmed:  "CONFIRMED",
          Cancelled:  "CANCELLED",
          Dispatched: "DISPATCHED",
        };
        return <StatusBadge status={statusMap[o.status] || o.status} />;
      },
    },
    {
      key:    "actions",
      header: "Actions",
      render: (o) => (
        <div className="flex items-center gap-1">
          {/* View — always visible */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openView(o); }}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="View"
          >
            <Eye size={14} className="text-muted-foreground" />
          </button>

          {/* Draft-only actions */}
          {o.status === "Draft" && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openEdit(o); }}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="Edit"
              >
                <Edit2 size={14} className="text-primary" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleConfirmFromList(o); }}
                className="p-1.5 rounded hover:bg-green-50 transition-colors"
                title="Confirm"
              >
                <Check size={14} className="text-green-600" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(o); }}
                className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                title="Delete"
              >
                <Trash2 size={14} className="text-destructive" />
              </button>
            </>
          )}

          {/* Confirmed-only actions */}
          {o.status === "Confirmed" && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDispatchFromList(o); }}
                className="p-1.5 rounded hover:bg-blue-50 transition-colors"
                title="Dispatch"
              >
                <Truck size={14} className="text-blue-600" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openInvoiceModal(o); }}
                className="p-1.5 rounded hover:bg-emerald-50 transition-colors"
                title="Generate Invoice"
              >
                <FileText size={14} className="text-emerald-600" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleCancelFromList(o); }}
                className="p-1.5 rounded hover:bg-red-50 transition-colors"
                title="Cancel"
              >
                <X size={14} className="text-red-600" />
              </button>
            </>
          )}

          {/* Dispatched: invoice generation */}
          {o.status === "Dispatched" && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openInvoiceModal(o); }}
              className="p-1.5 rounded hover:bg-emerald-50 transition-colors"
              title="Generate Invoice"
            >
              <FileText size={14} className="text-emerald-600" />
            </button>
          )}
        </div>
      ),
    },
  ];

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <>
      <div className="space-y-4">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Sales Channels Orders</h1>
            <p className="text-sm text-muted-foreground">
              Channel-based order entry — Website, Secondary, and Offline sales
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus size={15} />
            New Order
          </button>
        </div>

        {/* Channel Tab Bar */}
        <div className="flex border-b">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
              }`}
            >
              {TAB_ICONS[tab]}
              {tab}
            </button>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Total Orders"
            value={stats.totalOrders.toLocaleString()}
            icon={<ShoppingCart size={18} className="text-blue-600" />}
            colorClass="bg-blue-50/60"
          />
          <StatCard
            label="Total Qty"
            value={stats.totalQty.toLocaleString()}
            icon={<Package size={18} className="text-green-600" />}
            colorClass="bg-green-50/60"
          />
          <StatCard
            label="Total Value"
            value={formatCurrency(stats.totalValue)}
            icon={<ShoppingCart size={18} className="text-purple-600" />}
            colorClass="bg-purple-50/60"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2">
          {STATUS_FILTER_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
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

        {/* Data Table */}
        <DataTable
          title="Channel Orders"
          subtitle={`Showing ${activeTab === "All Orders" ? "all channels" : activeTab}`}
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
          onExport={() =>
            showToast("info", "Coming Soon", "Export feature is under development.")
          }
          addLabel="New Order"
          loading={loading}
          keyExtractor={(o) => o.orderId}
        />
      </div>

      {/* ========== CHANNEL ORDER ENTRY MODAL (XL) ========== */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title="Channel Order Entry"
        size="xl"
      >
        <div className="space-y-5">
          {/* Modal sub-title */}
          <div className="text-center border-b pb-4">
            <h2 className="text-xl font-bold tracking-wide uppercase">
              Channel Order Entry
            </h2>
            {editingOrder && (
              <p className="text-sm text-muted-foreground mt-1">
                {viewMode ? "Viewing" : "Editing"} {editingOrder.orderNo}
              </p>
            )}
          </div>

          {/* Header Fields: Date, Client, Store, Warehouse, Channel, Remarks */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-xl border">
            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Date
              </label>
              <input
                type="date"
                value={formOrderDate}
                onChange={(e) => setFormOrderDate(e.target.value)}
                disabled={viewMode}
                className={inputCls}
              />
            </div>

            {/* Client */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Client *
              </label>
              <select
                value={formClientId}
                onChange={(e) => {
                  setFormClientId(e.target.value);
                  setFormStoreId("");
                }}
                disabled={viewMode}
                className={inputCls}
              >
                <option value="">Select Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Store */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Store *
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
            </div>

            {/* Warehouse */}
            <div>
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

            {/* Channel */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Sales Channel *
              </label>
              <select
                value={formChannel}
                onChange={(e) => setFormChannel(e.target.value)}
                disabled={viewMode}
                className={inputCls}
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Remarks (optional)
              </label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                disabled={viewMode}
                placeholder="Order remarks..."
                className={inputCls}
              />
            </div>
          </div>

          {/* Article Section */}
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
                Select an article to begin size-wise channel order entry.
              </p>
              <div className="max-w-sm mx-auto">
                <ArticleSelector
                  articles={availableArticles}
                  onSelect={handleAddArticle}
                  excludeIds={excludedArticleIds}
                />
              </div>
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
                <ChannelSizeRunCard
                  key={entry.localId}
                  entry={entry}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemoveArticle}
                  readOnly={viewMode}
                />
              ))}

              {/* Add Article button (not in view mode) */}
              {!viewMode && (
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

          {/* Grand Total Footer */}
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
                <div className="flex items-center gap-1.5 text-red-600 text-sm font-medium bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                  <AlertTriangle size={16} />
                  Order qty exceeds available stock
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button
              type="button"
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
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm border rounded-lg hover:bg-muted transition-colors font-medium disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? "Saving..." : "Save as Draft"}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  disabled={confirming}
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

      {/* ========== GENERATE INVOICE MODAL ========== */}
      <Modal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        title="Generate Invoice"
        size="lg"
      >
        <div className="space-y-4">
          {invoiceOrder && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
              <FileText size={16} />
              <span>
                Creating invoice for order{" "}
                <strong>{invoiceOrder.orderNo}</strong> —{" "}
                {invoiceOrder.clientName} / {invoiceOrder.storeName}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Invoice Date *
              </label>
              <input
                type="date"
                value={invDate}
                onChange={(e) => setInvDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Margin % (all lines)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={invMarginPct}
                onChange={(e) => setInvMarginPct(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                PO Number
              </label>
              <input
                type="text"
                value={invPoNumber}
                onChange={(e) => setInvPoNumber(e.target.value)}
                placeholder="Purchase Order No"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                PO Date
              </label>
              <input
                type="date"
                value={invPoDate}
                onChange={(e) => setInvPoDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Carton Boxes
              </label>
              <input
                type="number"
                min="1"
                value={invCartonBoxes}
                onChange={(e) => setInvCartonBoxes(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Transport Mode
              </label>
              <select
                value={invTransportMode}
                onChange={(e) => setInvTransportMode(e.target.value)}
                className={inputCls}
              >
                <option>Road</option>
                <option>Rail</option>
                <option>Air</option>
                <option>Ship</option>
                <option>Courier</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Logistic Partner
              </label>
              <input
                type="text"
                value={invLogistic}
                onChange={(e) => setInvLogistic(e.target.value)}
                placeholder="Courier / Transporter name"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Vehicle / LR No
              </label>
              <input
                type="text"
                value={invVehicleNo}
                onChange={(e) => setInvVehicleNo(e.target.value)}
                placeholder="Vehicle / LR Number"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <input
              type="checkbox"
              id="invInterState"
              checked={invIsInterState}
              onChange={(e) => setInvIsInterState(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <label
              htmlFor="invInterState"
              className="text-sm font-medium cursor-pointer"
            >
              Inter-State Supply (IGST applies instead of CGST+SGST)
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
              Notes
            </label>
            <input
              type="text"
              value={invNotes}
              onChange={(e) => setInvNotes(e.target.value)}
              placeholder="Additional notes..."
              className={inputCls}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={() => setInvoiceModalOpen(false)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateInvoice}
              disabled={invCreating || !invDate}
              className="flex items-center gap-1.5 px-6 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold disabled:opacity-50 transition-colors"
            >
              <FileText size={14} />
              {invCreating ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
