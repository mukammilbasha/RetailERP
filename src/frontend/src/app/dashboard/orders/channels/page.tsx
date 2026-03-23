"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  storeName: string;
  channel: string;
  totalQuantity: number;
  totalValue: number;
  status: string;
  remarks?: string;
  lineItems?: ChannelArticleEntry[];
}

interface ChannelArticleEntry {
  localId: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  brandName: string;
  colour: string;
  hsnCode: string;
  mrp: number;
  sizes: ChannelSizeEntry[];
}

interface ChannelSizeEntry {
  euroSize: number;
  ukSize: string;
  indSize: string;
  openingStock: number;
  orderQty: number;
  closingStock: number;
}

interface DropdownItem {
  id: string;
  name: string;
}

interface ArticleOption {
  articleId: string;
  articleCode: string;
  articleName: string;
  brandName: string;
  colour: string;
  hsnCode: string;
  mrp: number;
}

interface SizeChartEntry {
  euroSize: number;
  ukSize: string;
  indSize: string;
}

interface ChannelStats {
  totalOrders: number;
  totalQty: number;
  totalValue: number;
}

/* ================================================================
   CONSTANTS
   ================================================================ */

const SIZE_RUN_LABELS = [
  "39-05", "39-6.5", "40-07", "40-7.5", "41-08", "41-8.5",
  "42-09", "42-9.5", "43-10", "43-10.5", "44-11", "45-12",
];

const DEFAULT_SIZE_CHART: SizeChartEntry[] = [
  { euroSize: 39, ukSize: "05", indSize: "05" },
  { euroSize: 39, ukSize: "6.5", indSize: "6.5" },
  { euroSize: 40, ukSize: "07", indSize: "07" },
  { euroSize: 40, ukSize: "7.5", indSize: "7.5" },
  { euroSize: 41, ukSize: "08", indSize: "08" },
  { euroSize: 41, ukSize: "8.5", indSize: "8.5" },
  { euroSize: 42, ukSize: "09", indSize: "09" },
  { euroSize: 42, ukSize: "9.5", indSize: "9.5" },
  { euroSize: 43, ukSize: "10", indSize: "10" },
  { euroSize: 43, ukSize: "10.5", indSize: "10.5" },
  { euroSize: 44, ukSize: "11", indSize: "11" },
  { euroSize: 45, ukSize: "12", indSize: "12" },
];

const inputCls =
  "w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

const TABS = ["All Orders", "Website Sales", "Secondary Sales", "Offline Sales"] as const;
type TabType = (typeof TABS)[number];

const CHANNELS = ["Website", "Secondary", "Offline", "Direct"] as const;

const TAB_CHANNEL_MAP: Record<TabType, string | undefined> = {
  "All Orders": undefined,
  "Website Sales": "Website",
  "Secondary Sales": "Secondary",
  "Offline Sales": "Offline",
};

const TAB_ICONS: Record<TabType, React.ReactNode> = {
  "All Orders": <ShoppingCart size={14} />,
  "Website Sales": <Globe size={14} />,
  "Secondary Sales": <Users size={14} />,
  "Offline Sales": <Store size={14} />,
};

/* ================================================================
   STAT CARD
   ================================================================ */

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${color}`}>
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
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 text-sm border-2 border-dashed border-primary/40 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-primary font-medium w-full justify-center"
      >
        <Plus size={16} />
        Add Article
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full bg-card border rounded-xl shadow-xl z-40 max-h-72 overflow-hidden">
            <div className="p-2 border-b">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
                      <span className="text-sm font-medium">{article.articleName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{article.colour}</span>
                      <span className="text-xs font-medium">{formatCurrency(article.mrp)}</span>
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
   SIZE RUN CARD FOR CHANNEL ORDER
   ================================================================ */

function ChannelSizeRunCard({
  entry,
  onQuantityChange,
  onRemove,
}: {
  entry: ChannelArticleEntry;
  onQuantityChange: (localId: string, sizeIndex: number, qty: number) => void;
  onRemove: (localId: string) => void;
}) {
  const totalQty = entry.sizes.reduce((sum, s) => sum + s.orderQty, 0);
  const totalAmount = totalQty * entry.mrp;
  const hasStockExceeded = entry.sizes.some(
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
          {entry.brandName && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {entry.brandName}
            </span>
          )}
          {entry.colour && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              {entry.colour}
            </span>
          )}
          {entry.hsnCode && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
              HSN: {entry.hsnCode}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">
            MRP: <span className="text-foreground font-semibold">{formatCurrency(entry.mrp)}</span>
          </span>
          <button
            onClick={() => onRemove(entry.localId)}
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
            title="Remove article"
          >
            <Trash2 size={16} className="text-destructive" />
          </button>
        </div>
      </div>

      {/* Size Run Chart Title */}
      <div className="text-center py-2 bg-muted/20 border-b">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Size Run Chart &mdash; Channel Order Entry
        </p>
      </div>

      {/* Size Run Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-muted/30">
              <th className="px-3 py-2 text-left font-bold text-primary border-r border-border/50 w-28 whitespace-nowrap">
                SIZE
              </th>
              {SIZE_RUN_LABELS.map((label, idx) => (
                <th
                  key={idx}
                  className="px-2 py-2 text-center font-bold text-primary border-r border-border/50 whitespace-nowrap"
                >
                  {label}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-bold text-primary whitespace-nowrap w-16">
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {/* EURO SIZE Row */}
            <tr className="border-b border-border/30">
              <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50">
                EURO SIZE
              </td>
              {entry.sizes.map((s, idx) => (
                <td key={idx} className="px-2 py-1.5 text-center border-r border-border/50">
                  {s.euroSize}
                </td>
              ))}
              <td className="px-3 py-1.5 text-center" />
            </tr>
            {/* SIZE (IND-UK) Row */}
            <tr className="border-b border-border/30">
              <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50">
                SIZE (IND-UK)
              </td>
              {entry.sizes.map((s, idx) => (
                <td key={idx} className="px-2 py-1.5 text-center border-r border-border/50">
                  {s.indSize}
                </td>
              ))}
              <td className="px-3 py-1.5 text-center" />
            </tr>
            {/* OPENING STOCK Row */}
            <tr className="border-b border-border/30 bg-green-50/50">
              <td className="px-3 py-1.5 font-semibold text-green-700 border-r border-border/50">
                OPENING STOCK
              </td>
              {entry.sizes.map((s, idx) => (
                <td key={idx} className="px-2 py-1.5 text-center border-r border-border/50 font-medium text-green-700">
                  {s.openingStock}
                </td>
              ))}
              <td className="px-3 py-1.5 text-center font-bold text-green-700">
                {entry.sizes.reduce((sum, s) => sum + s.openingStock, 0)}
              </td>
            </tr>
            {/* ORDER QTY Row (editable, orange) */}
            <tr className="border-b border-border/30">
              <td className="px-3 py-2 font-bold text-foreground border-r border-border/50 bg-amber-50">
                ORDER QTY
              </td>
              {entry.sizes.map((s, idx) => {
                const exceeded = s.orderQty > 0 && s.orderQty > s.openingStock;
                return (
                  <td
                    key={idx}
                    className="px-1 py-1.5 text-center border-r border-border/50 bg-amber-50"
                  >
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
                  </td>
                );
              })}
              <td className="px-3 py-1.5 text-center font-bold text-base bg-amber-50">
                {totalQty}
              </td>
            </tr>
            {/* CLOSING STOCK Row */}
            <tr>
              <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50 bg-blue-50/50">
                CLOSING STOCK
              </td>
              {entry.sizes.map((s, idx) => {
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
              <td className="px-3 py-1.5 text-center font-bold text-blue-700 bg-blue-50/50">
                {entry.sizes.reduce((sum, s) => sum + (s.openingStock - s.orderQty), 0)}
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
              <span className="font-bold text-foreground text-base">{totalQty}</span>
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            Amount:{" "}
            <span className="font-bold text-foreground text-base">
              {formatCurrency(totalAmount)}
            </span>
          </span>
        </div>
        {hasStockExceeded && (
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
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [stats, setStats] = useState<ChannelStats>({
    totalOrders: 0,
    totalQty: 0,
    totalValue: 0,
  });

  /* ---- Form header state ---- */
  const [formClientId, setFormClientId] = useState("");
  const [formStoreId, setFormStoreId] = useState("");
  const [formOrderDate, setFormOrderDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formChannel, setFormChannel] = useState<string>("Website");
  const [formRemarks, setFormRemarks] = useState("");

  /* ---- Form article entries ---- */
  const [articleEntries, setArticleEntries] = useState<ChannelArticleEntry[]>([]);

  /* ---- Reference data ---- */
  const [clients, setClients] = useState<DropdownItem[]>([]);
  const [stores, setStores] = useState<DropdownItem[]>([]);
  const [availableArticles, setAvailableArticles] = useState<ArticleOption[]>([]);
  const [sizeChart] = useState<SizeChartEntry[]>(DEFAULT_SIZE_CHART);

  /* ---- UI state ---- */
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  /* ---- Fetch orders ---- */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const channel = TAB_CHANNEL_MAP[activeTab];
      const { data } = await api.get<ApiResponse<any>>("/api/orders", {
        params: {
          searchTerm: search || undefined,
          pageNumber: page,
          pageSize: 25,
          channel: channel || undefined,
        },
      });
      if (data.success) {
        const items = data.data?.items || [];
        setOrders(items);
        setTotalCount(data.data?.totalCount || 0);

        const calcStats = items.reduce(
          (acc: ChannelStats, o: Order) => {
            acc.totalOrders++;
            acc.totalQty += o.totalQuantity || 0;
            acc.totalValue += o.totalValue || 0;
            return acc;
          },
          { totalOrders: 0, totalQty: 0, totalValue: 0 }
        );
        setStats({
          totalOrders: data.data?.totalCount || calcStats.totalOrders,
          totalQty: calcStats.totalQty,
          totalValue: calcStats.totalValue,
        });
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeTab]);

  /* ---- Fetch reference data ---- */
  const fetchDropdowns = useCallback(async () => {
    try {
      const [clientRes, articleRes] = await Promise.all([
        api.get<ApiResponse<any>>("/api/clients", { params: { pageSize: 500 } }),
        api.get<ApiResponse<any>>("/api/articles", { params: { pageSize: 500 } }),
      ]);
      if (clientRes.data.success) {
        const items = clientRes.data.data?.items || clientRes.data.data || [];
        setClients(items.map((c: any) => ({ id: c.clientId, name: c.clientName })));
      }
      if (articleRes.data.success) {
        const items = articleRes.data.data?.items || articleRes.data.data || [];
        setAvailableArticles(
          items.map((a: any) => ({
            articleId: a.articleId,
            articleCode: a.articleCode,
            articleName: a.articleName,
            brandName: a.brandName || "",
            colour: a.color || a.colour || "",
            hsnCode: a.hsnCode || "",
            mrp: a.mrp || 0,
          }))
        );
      }
    } catch {
      /* silent */
    }
  }, []);

  const fetchStores = async (clientId: string) => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/stores", {
        params: { clientId, pageSize: 500 },
      });
      if (data.success) {
        const items = data.data?.items || data.data || [];
        setStores(items.map((s: any) => ({ id: s.storeId, name: s.storeName })));
      }
    } catch {
      setStores([]);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  useEffect(() => {
    if (formClientId) fetchStores(formClientId);
    else setStores([]);
  }, [formClientId]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  /* ---- Build size entries ---- */
  const buildSizeEntries = useCallback((): ChannelSizeEntry[] => {
    return sizeChart.map((sc) => ({
      euroSize: sc.euroSize,
      ukSize: sc.ukSize,
      indSize: sc.indSize,
      openingStock: Math.floor(Math.random() * 50) + 5, // Placeholder: replace with API
      orderQty: 0,
      closingStock: 0,
    }));
  }, [sizeChart]);

  /* ---- Add article ---- */
  const handleAddArticle = useCallback(
    (article: ArticleOption) => {
      const sizes = buildSizeEntries();
      const newEntry: ChannelArticleEntry = {
        localId: `${article.articleId}-${Date.now()}`,
        articleId: article.articleId,
        articleCode: article.articleCode,
        articleName: article.articleName,
        brandName: article.brandName,
        colour: article.colour,
        hsnCode: article.hsnCode,
        mrp: article.mrp,
        sizes,
      };
      setArticleEntries((prev) => [...prev, newEntry]);
    },
    [buildSizeEntries]
  );

  /* ---- Remove article ---- */
  const handleRemoveArticle = useCallback((localId: string) => {
    setArticleEntries((prev) => prev.filter((e) => e.localId !== localId));
  }, []);

  /* ---- Update quantity ---- */
  const handleQuantityChange = useCallback(
    (localId: string, sizeIndex: number, qty: number) => {
      setArticleEntries((prev) =>
        prev.map((entry) => {
          if (entry.localId !== localId) return entry;
          const newSizes = [...entry.sizes];
          newSizes[sizeIndex] = {
            ...newSizes[sizeIndex],
            orderQty: qty,
            closingStock: newSizes[sizeIndex].openingStock - qty,
          };
          return { ...entry, sizes: newSizes };
        })
      );
    },
    []
  );

  /* ---- Computed totals ---- */
  const grandTotals = useMemo(() => {
    let totalArticles = articleEntries.length;
    let totalPairs = 0;
    let totalValue = 0;
    articleEntries.forEach((entry) => {
      const entryQty = entry.sizes.reduce((sum, s) => sum + s.orderQty, 0);
      totalPairs += entryQty;
      totalValue += entryQty * entry.mrp;
    });
    return { totalArticles, totalPairs, totalValue };
  }, [articleEntries]);

  const hasStockValidationErrors = useMemo(() => {
    return articleEntries.some((entry) =>
      entry.sizes.some((s) => s.orderQty > 0 && s.orderQty > s.openingStock)
    );
  }, [articleEntries]);

  const excludedArticleIds = useMemo(
    () => articleEntries.map((e) => e.articleId),
    [articleEntries]
  );

  /* ---- CRUD: Open add ---- */
  const openAdd = () => {
    setFormClientId("");
    setFormStoreId("");
    setFormOrderDate(new Date().toISOString().split("T")[0]);
    setFormChannel(TAB_CHANNEL_MAP[activeTab] || "Website");
    setFormRemarks("");
    setArticleEntries([]);
    setModalOpen(true);
  };

  /* ---- CRUD: Save as Draft ---- */
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
      await api.post("/api/orders", {
        clientId: formClientId,
        storeId: formStoreId,
        orderDate: formOrderDate,
        channel: formChannel,
        remarks: formRemarks || undefined,
        status: "DRAFT",
        lineItems: articleEntries.map((entry) => ({
          articleId: entry.articleId,
          mrp: entry.mrp,
          sizes: entry.sizes
            .filter((s) => s.orderQty > 0)
            .map((s) => ({
              euroSize: s.euroSize,
              ukSize: s.ukSize,
              quantity: s.orderQty,
            })),
          totalQty: entry.sizes.reduce((sum, s) => sum + s.orderQty, 0),
          totalAmount: entry.sizes.reduce((sum, s) => sum + s.orderQty, 0) * entry.mrp,
        })),
        totalQuantity: grandTotals.totalPairs,
        totalValue: grandTotals.totalValue,
      });
      setModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  /* ---- CRUD: Confirm Order ---- */
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
      alert("Cannot confirm: order quantities exceed available stock for some sizes.");
      return;
    }
    setConfirming(true);
    try {
      await api.post("/api/orders", {
        clientId: formClientId,
        storeId: formStoreId,
        orderDate: formOrderDate,
        channel: formChannel,
        remarks: formRemarks || undefined,
        status: "CONFIRMED",
        lineItems: articleEntries.map((entry) => ({
          articleId: entry.articleId,
          mrp: entry.mrp,
          sizes: entry.sizes
            .filter((s) => s.orderQty > 0)
            .map((s) => ({
              euroSize: s.euroSize,
              ukSize: s.ukSize,
              quantity: s.orderQty,
            })),
          totalQty: entry.sizes.reduce((sum, s) => sum + s.orderQty, 0),
          totalAmount: entry.sizes.reduce((sum, s) => sum + s.orderQty, 0) * entry.mrp,
        })),
        totalQuantity: grandTotals.totalPairs,
        totalValue: grandTotals.totalValue,
      });
      setModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to confirm order");
    } finally {
      setConfirming(false);
    }
  };

  /* ---- CRUD: Delete ---- */
  const handleDelete = async (order: Order) => {
    if (!confirm(`Delete order "${order.orderNo}"?`)) return;
    try {
      await api.delete(`/api/orders/${order.orderId}`);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete order");
    }
  };

  /* ---- Channel badge ---- */
  const channelBadge = (channel: string) => {
    const styles: Record<string, string> = {
      Website: "bg-blue-100 text-blue-700",
      Secondary: "bg-orange-100 text-orange-700",
      Offline: "bg-green-100 text-green-700",
      Direct: "bg-purple-100 text-purple-700",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${
          styles[channel] || "bg-gray-100 text-gray-700"
        }`}
      >
        {channel}
      </span>
    );
  };

  /* ---- Columns ---- */
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
    { key: "storeName", header: "Store" },
    {
      key: "channel",
      header: "Channel",
      render: (o) => channelBadge(o.channel),
    },
    {
      key: "articles",
      header: "Article",
      render: (o) => {
        if (!o.lineItems || o.lineItems.length === 0) return "-";
        const first = o.lineItems[0];
        return (
          <div>
            <span className="font-mono text-xs">{first.articleCode}</span>
            {o.lineItems.length > 1 && (
              <span className="text-xs text-muted-foreground ml-1">
                +{o.lineItems.length - 1} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "totalQuantity",
      header: "Total Qty",
      render: (o) => <span className="font-semibold">{o.totalQuantity}</span>,
      className: "text-right",
    },
    {
      key: "totalValue",
      header: "Total Value",
      render: (o) => (
        <span className="font-semibold">{formatCurrency(o.totalValue)}</span>
      ),
      className: "text-right",
    },
    {
      key: "status",
      header: "Status",
      render: (o) => <StatusBadge status={o.status} />,
    },
  ];

  /* ---- Render ---- */
  return (
    <>
      <div className="space-y-4">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Sales Channels</h1>
            <p className="text-sm text-muted-foreground">
              Size-wise order entry by sales channel
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            + New Order
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Total Orders"
            value={stats.totalOrders.toLocaleString()}
            icon={<ShoppingCart size={18} className="text-blue-600" />}
            color="bg-blue-50/50"
          />
          <StatCard
            label="Total Qty"
            value={stats.totalQty.toLocaleString()}
            icon={<Store size={18} className="text-green-600" />}
            color="bg-green-50/50"
          />
          <StatCard
            label="Total Value"
            value={formatCurrency(stats.totalValue)}
            icon={<ShoppingCart size={18} className="text-purple-600" />}
            color="bg-purple-50/50"
          />
        </div>

        {/* Data Table */}
        <DataTable
          title=""
          columns={columns}
          data={orders}
          totalCount={totalCount}
          pageNumber={page}
          pageSize={25}
          onPageChange={setPage}
          onSearch={setSearch}
          onDelete={handleDelete}
          onExport={() => alert("Export feature coming soon")}
          loading={loading}
          keyExtractor={(o) => o.orderId}
        />
      </div>

      {/* ========== NEW CHANNEL ORDER MODAL (XL) ========== */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Channel Order"
        subtitle="Size-wise order entry with channel assignment"
        size="xl"
      >
        <div className="space-y-5">
          {/* ---- Header Fields ---- */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-xl border">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Sales Channel *
              </label>
              <select
                value={formChannel}
                onChange={(e) => setFormChannel(e.target.value)}
                className={inputCls}
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Client *
              </label>
              <select
                value={formClientId}
                onChange={(e) => {
                  setFormClientId(e.target.value);
                  setFormStoreId("");
                }}
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
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Store *
              </label>
              <select
                value={formStoreId}
                onChange={(e) => setFormStoreId(e.target.value)}
                disabled={!formClientId}
                className={inputCls}
              >
                <option value="">
                  {formClientId ? "Select Store" : "Select Client first"}
                </option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Order Date
              </label>
              <input
                type="date"
                value={formOrderDate}
                onChange={(e) => setFormOrderDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* ---- Remarks ---- */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              Remarks (optional)
            </label>
            <input
              type="text"
              value={formRemarks}
              onChange={(e) => setFormRemarks(e.target.value)}
              placeholder="Optional order remarks"
              className={inputCls}
            />
          </div>

          {/* ---- Article Entries with Size Run Cards ---- */}
          {articleEntries.length === 0 ? (
            <div className="border-2 border-dashed rounded-xl p-12 text-center">
              <Package size={48} className="mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-1">
                No articles added yet
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Select an article to begin size-wise order entry.
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
              {articleEntries.map((entry) => (
                <ChannelSizeRunCard
                  key={entry.localId}
                  entry={entry}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemoveArticle}
                />
              ))}

              {/* + Add Article button */}
              <div className="max-w-md">
                <ArticleSelector
                  articles={availableArticles}
                  onSelect={handleAddArticle}
                  excludeIds={excludedArticleIds}
                />
              </div>
            </div>
          )}

          {/* ---- Grand Total Footer ---- */}
          {articleEntries.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-card border rounded-xl shadow-sm">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Total Articles
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {grandTotals.totalArticles}
                  </p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Total Pairs
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {grandTotals.totalPairs}
                  </p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Total Value
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(grandTotals.totalValue)}
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
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
            >
              Cancel
            </button>
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
              className="flex items-center gap-1.5 px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50 shadow-sm"
            >
              <CheckCircle size={14} />
              {confirming ? "Confirming..." : "Confirm Order"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
