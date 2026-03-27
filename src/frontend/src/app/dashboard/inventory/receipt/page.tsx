"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  Printer,
  Download,
  Save,
  CheckCircle,
  Trash2,
  Plus,
  Barcode,
  Package,
  ChevronDown,
  Search,
  ArrowLeft,
  Edit2,
  Eye,
  RefreshCw,
  ClipboardList,
} from "lucide-react";

/* ========== Types ========== */
interface Warehouse {
  warehouseId: string;
  warehouseName: string;
}

interface Article {
  articleId: string;
  articleCode: string;
  articleName: string;
  brandName: string;
  genderName?: string;
  segmentName: string;
  categoryName: string;
  mrp: number;
  isSizeBased: boolean;
  uom?: string;
  color: string;
}

interface SizeChartEntry {
  euroSize: number;
  ukSize: string;
  indSize: string;
  usaSize: string;
  cm: string;
  inch: string;
}

interface GrnSizeEntry {
  euroSize: number;
  ukSize: string;
  indSize: string;
  usaSize: string;
  cm: string;
  inch: string;
  eanCode: string;
  styleCode: string;
  quantity: number;
}

interface GrnArticleEntry {
  localId: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  brand: string;
  gender: string;
  uom: string;
  sizes: GrnSizeEntry[];
}

interface GrnListRow {
  grnId: string;
  grnNumber: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  receiptDate: string;
  sourceType: string;
  referenceNo?: string;
  status: string;
  totalQuantity: number;
  lineCount: number;
  createdAt: string;
}

interface GrnDetailLine {
  grnLineId: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  euroSize?: number;
  quantity: number;
}

/* ========== Constants ========== */
const DEFAULT_SIZE_CHART: SizeChartEntry[] = [
  { euroSize: 39, ukSize: "06", indSize: "06", usaSize: "6.5", cm: "24.5", inch: "9.6" },
  { euroSize: 39, ukSize: "06.5", indSize: "06.5", usaSize: "7", cm: "25", inch: "9.8" },
  { euroSize: 40, ukSize: "07", indSize: "07", usaSize: "7.5", cm: "25.5", inch: "10" },
  { euroSize: 40, ukSize: "07.5", indSize: "07.5", usaSize: "8", cm: "26", inch: "10.2" },
  { euroSize: 41, ukSize: "08", indSize: "08", usaSize: "8.5", cm: "26.5", inch: "10.4" },
  { euroSize: 41, ukSize: "08.5", indSize: "08.5", usaSize: "9", cm: "27", inch: "10.6" },
  { euroSize: 42, ukSize: "09", indSize: "09", usaSize: "9.5", cm: "27.5", inch: "10.8" },
  { euroSize: 42, ukSize: "09.5", indSize: "09.5", usaSize: "10", cm: "28", inch: "11" },
  { euroSize: 43, ukSize: "10", indSize: "10", usaSize: "10.5", cm: "28.5", inch: "11.2" },
  { euroSize: 43, ukSize: "10.5", indSize: "10.5", usaSize: "11", cm: "29", inch: "11.4" },
  { euroSize: 44, ukSize: "11", indSize: "11", usaSize: "11.5", cm: "29.5", inch: "11.6" },
  { euroSize: 45, ukSize: "12", indSize: "12", usaSize: "12.5", cm: "30.5", inch: "12" },
];

/* ========== Helpers ========== */
function generateEan13(articleIndex: number, sizeIndex: number): string {
  const base = 8596119;
  const artPart = articleIndex.toString().padStart(3, "0");
  const sizePart = sizeIndex.toString().padStart(3, "0");
  const partial = `${base}${artPart}${sizePart}`;
  const digits = partial.slice(0, 12).split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${partial.slice(0, 12)}${checkDigit}`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Draft: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    Confirmed: "bg-green-100 text-green-800 border border-green-300",
    Cancelled: "bg-red-100 text-red-700 border border-red-300",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}

/* ========== Article Selector Dropdown ========== */
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
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full bg-card border rounded-xl shadow-xl z-40 max-h-72 overflow-hidden min-w-[340px]">
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
                <div className="p-4 text-sm text-muted-foreground text-center">No articles available</div>
              ) : (
                filtered.map((article) => (
                  <button
                    key={article.articleId}
                    onClick={() => { onSelect(article); setOpen(false); setSearch(""); }}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-2">
                        {article.articleCode}
                      </span>
                      <span className="text-sm font-medium">{article.articleName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{article.brandName}</span>
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

/* ========== Size Run Card ========== */
function SizeRunCard({
  entry,
  onQuantityChange,
  onRemove,
  readOnly,
}: {
  entry: GrnArticleEntry;
  onQuantityChange: (localId: string, sizeIndex: number, qty: number) => void;
  onRemove: (localId: string) => void;
  readOnly?: boolean;
}) {
  const totalQty = entry.sizes.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 bg-muted/40 border-b">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-md font-bold">
            {entry.articleCode}
          </span>
          <span className="text-sm font-semibold">{entry.articleName}</span>
          {entry.brand && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {entry.brand}
            </span>
          )}
          {entry.gender && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              {entry.gender}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">
            UOM: <span className="text-foreground font-semibold">{entry.uom}</span>
          </span>
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
      </div>

      <div className="text-center py-2 bg-muted/20 border-b">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Men&apos;s Size Run Chart
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-muted/30">
              <th className="px-3 py-2 text-left font-bold text-primary border-r border-border/50 w-28 whitespace-nowrap">
                IND-UK-SIZE
              </th>
              {entry.sizes.map((s, idx) => (
                <th key={idx} className="px-2 py-2 text-center font-bold text-primary border-r border-border/50 whitespace-nowrap">
                  {s.euroSize}-{s.ukSize}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: "UK SIZE", field: "ukSize" as const },
              { label: "IND SIZE", field: "indSize" as const },
              { label: "USA SIZE", field: "usaSize" as const },
              { label: "EURO SIZE", field: "euroSize" as const },
              { label: "CM", field: "cm" as const },
              { label: "INCH", field: "inch" as const },
            ].map(({ label, field }) => (
              <tr key={label} className="border-b border-border/30">
                <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50">{label}</td>
                {entry.sizes.map((s, idx) => (
                  <td key={idx} className="px-2 py-1.5 text-center border-r border-border/50">{s[field]}</td>
                ))}
              </tr>
            ))}
            <tr className="border-b border-border/30">
              <td className="px-3 py-2 font-semibold text-muted-foreground border-r border-border/50 bg-amber-50">EAN CODE</td>
              {entry.sizes.map((s, idx) => (
                <td key={idx} className="px-1 py-2 text-center border-r border-border/50 bg-amber-50">
                  <span className="font-mono text-[10px] leading-tight block text-amber-800">{s.eanCode}</span>
                </td>
              ))}
            </tr>
            <tr className="border-b border-border/30">
              <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50">STYLE CODE</td>
              {entry.sizes.map((s, idx) => (
                <td key={idx} className="px-2 py-1.5 text-center font-mono text-[10px] border-r border-border/50">{s.styleCode}</td>
              ))}
            </tr>
            <tr>
              <td className="px-3 py-2 font-bold text-foreground border-r border-border/50 bg-amber-50">QNTY</td>
              {entry.sizes.map((s, idx) => (
                <td key={idx} className="px-1 py-1.5 text-center border-r border-border/50 bg-amber-50">
                  {readOnly ? (
                    <span className="text-sm font-bold">{s.quantity || 0}</span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      value={s.quantity || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        onQuantityChange(entry.localId, idx, val < 0 ? 0 : val);
                      }}
                      className="w-full px-1 py-1.5 text-center text-sm font-bold bg-amber-100 border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      placeholder="0"
                    />
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-5 py-3 bg-muted/20 border-t">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            TOTAL QNTY: <span className="font-bold text-foreground text-base">{totalQty}</span>
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          UOM: <span className="font-bold text-foreground">{entry.uom}</span>
        </span>
      </div>
    </div>
  );
}

/* ========== GRN LIST VIEW ========== */
function GrnListView({
  onNew,
  onEdit,
  onView,
}: {
  onNew: () => void;
  onEdit: (grn: GrnListRow) => void;
  onView: (grn: GrnListRow) => void;
}) {
  const [grns, setGrns] = useState<GrnListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const fetchGrns = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouseId = warehouseFilter;
      const res = await api.get<ApiResponse<GrnListRow[]>>("/api/stock/grn", { params });
      if (res.data.success) setGrns(res.data.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [statusFilter, warehouseFilter]);

  useEffect(() => {
    fetchGrns();
  }, [fetchGrns]);

  useEffect(() => {
    api.get<ApiResponse<any>>("/api/warehouses", { params: { pageSize: 200 } }).then((r) => {
      if (r.data.success) setWarehouses(r.data.data?.items || []);
    }).catch(() => {});
  }, []);

  const handleDelete = async (grn: GrnListRow) => {
    if (!confirm(`Delete GRN ${grn.grnNumber}? This cannot be undone.`)) return;
    setDeleting(grn.grnId);
    try {
      await api.delete(`/api/stock/grn/${grn.grnId}`);
      fetchGrns();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete GRN.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList size={22} className="text-primary" />
            Goods Received Notes (GRN)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage stock receipts — create, edit, and confirm GRNs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchGrns}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 px-5 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-semibold shadow-sm"
          >
            <Plus size={14} /> New GRN
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-card border rounded-xl shadow-sm">
        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="">All Warehouses</option>
          {warehouses.map((w) => (
            <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseName}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Confirmed">Confirmed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading GRNs...</div>
        ) : grns.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No GRNs found. Create one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">GRN Number</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Warehouse</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Receipt Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Source</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Qty</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Lines</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grns.map((grn) => (
                  <tr key={grn.grnId} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{grn.grnNumber}</td>
                    <td className="px-4 py-3">{grn.warehouseName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(grn.receiptDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{grn.sourceType}</td>
                    <td className="px-4 py-3 text-right font-semibold">{grn.totalQuantity}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{grn.lineCount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge(grn.status)}`}>
                        {grn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onView(grn)}
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          title="View"
                        >
                          <Eye size={14} className="text-muted-foreground" />
                        </button>
                        {grn.status === "Draft" && (
                          <>
                            <button
                              onClick={() => onEdit(grn)}
                              className="p-1.5 rounded hover:bg-muted transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={14} className="text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(grn)}
                              disabled={deleting === grn.grnId}
                              className="p-1.5 rounded hover:bg-destructive/10 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 size={14} className="text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== MAIN PAGE ========== */
type PageMode = "list" | "create" | "edit" | "view";

export default function StockReceiptPage() {
  /* ---- Mode ---- */
  const [mode, setMode] = useState<PageMode>("list");
  const [editGrnId, setEditGrnId] = useState<string | null>(null);

  /* ---- Reference data ---- */
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [availableArticles, setAvailableArticles] = useState<Article[]>([]);
  const [sizeChart, setSizeChart] = useState<SizeChartEntry[]>(DEFAULT_SIZE_CHART);

  /* ---- GRN header state ---- */
  const [savedGrnNumber, setSavedGrnNumber] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [sourceType, setSourceType] = useState("Purchase");
  const [referenceNo, setReferenceNo] = useState("");
  const [barcodeScan, setBarcodeScan] = useState("");

  /* ---- GRN article entries ---- */
  const [grnEntries, setGrnEntries] = useState<GrnArticleEntry[]>([]);

  /* ---- UI state ---- */
  const [saving, setSaving] = useState(false);
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [viewReadOnly, setViewReadOnly] = useState(false);

  /* ---- Fetch reference data ---- */
  const fetchReferenceData = useCallback(async () => {
    try {
      const [whRes, artRes] = await Promise.all([
        api.get<ApiResponse<any>>("/api/warehouses", { params: { pageSize: 200 } }),
        api.get<ApiResponse<any>>("/api/articles", { params: { pageSize: 500 } }),
      ]);
      if (whRes.data.success) setWarehouses(whRes.data.data?.items || []);
      if (artRes.data.success) setAvailableArticles(artRes.data.data?.items || []);
    } catch { /* silently fail */ }

    try {
      const scRes = await api.get<ApiResponse<any>>("/api/sizecharts", { params: { pageSize: 200 } });
      if (scRes.data.success) {
        const items = scRes.data.data?.items || scRes.data.data || [];
        if (items.length > 0) {
          setSizeChart(items.map((item: any) => ({
            euroSize: item.euroSize ?? item.euro,
            ukSize: String(item.ukSize ?? item.uk ?? ""),
            indSize: String(item.indSize ?? item.ind ?? ""),
            usaSize: String(item.usaSize ?? item.usa ?? ""),
            cm: String(item.cm ?? ""),
            inch: String(item.inch ?? ""),
          })));
        }
      }
    } catch { /* use default size chart */ }
  }, []);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  /* ---- Build size entries for an article ---- */
  const buildSizeEntries = useCallback(
    (article: Article, artGlobalIndex: number): GrnSizeEntry[] =>
      sizeChart.map((sc, sizeIdx) => ({
        euroSize: sc.euroSize,
        ukSize: sc.ukSize,
        indSize: sc.indSize,
        usaSize: sc.usaSize,
        cm: sc.cm,
        inch: sc.inch,
        eanCode: generateEan13(artGlobalIndex, sizeIdx),
        styleCode: article.articleCode,
        quantity: 0,
      })),
    [sizeChart]
  );

  /* ---- Reset form ---- */
  const resetForm = useCallback(() => {
    setSavedGrnNumber("");
    setWarehouseId("");
    setReceiptDate(new Date().toISOString().split("T")[0]);
    setSourceType("Purchase");
    setReferenceNo("");
    setBarcodeScan("");
    setGrnEntries([]);
    setEditGrnId(null);
    setViewReadOnly(false);
  }, []);

  /* ---- Load existing GRN for edit/view ---- */
  const loadGrn = useCallback(async (grnId: string, readOnly: boolean) => {
    try {
      const res = await api.get<ApiResponse<any>>(`/api/stock/grn/${grnId}`);
      if (!res.data.success) return;
      const detail = res.data.data;
      setSavedGrnNumber(detail.grnNumber);
      setWarehouseId(detail.warehouseId);
      setReceiptDate(detail.receiptDate?.split("T")[0] ?? new Date().toISOString().split("T")[0]);
      setSourceType(detail.sourceType || "Purchase");
      setReferenceNo(detail.referenceNo || "");
      setViewReadOnly(readOnly);
      setEditGrnId(grnId);

      // Rebuild entries from GRN lines grouped by articleId
      const lines: GrnDetailLine[] = detail.lines || [];
      const grouped = new Map<string, GrnDetailLine[]>();
      for (const line of lines) {
        if (!grouped.has(line.articleId)) grouped.set(line.articleId, []);
        grouped.get(line.articleId)!.push(line);
      }

      const entries: GrnArticleEntry[] = [];
      for (const [articleId, artLines] of grouped.entries()) {
        const article = availableArticles.find((a) => a.articleId === articleId);
        const firstLine = artLines[0];
        const artIndex = availableArticles.findIndex((a) => a.articleId === articleId);
        const sizes: GrnSizeEntry[] = sizeChart.map((sc, sizeIdx) => {
          const existing = artLines.find((l) => l.euroSize === sc.euroSize);
          return {
            euroSize: sc.euroSize,
            ukSize: sc.ukSize,
            indSize: sc.indSize,
            usaSize: sc.usaSize,
            cm: sc.cm,
            inch: sc.inch,
            eanCode: generateEan13(artIndex >= 0 ? artIndex : entries.length, sizeIdx),
            styleCode: article?.articleCode ?? firstLine.articleCode,
            quantity: existing?.quantity ?? 0,
          };
        });
        entries.push({
          localId: `${articleId}-loaded`,
          articleId,
          articleCode: article?.articleCode ?? firstLine.articleCode,
          articleName: article?.articleName ?? firstLine.articleName,
          brand: article?.brandName ?? "",
          gender: article?.genderName ?? "",
          uom: article?.uom ?? "PAIRS",
          sizes,
        });
      }
      setGrnEntries(entries);
    } catch {
      alert("Failed to load GRN details.");
    }
  }, [availableArticles, sizeChart]);

  /* ---- Navigation handlers ---- */
  const handleNew = useCallback(() => {
    resetForm();
    setMode("create");
  }, [resetForm]);

  const handleEdit = useCallback(async (grn: GrnListRow) => {
    resetForm();
    setMode("edit");
    await loadGrn(grn.grnId, false);
  }, [resetForm, loadGrn]);

  const handleView = useCallback(async (grn: GrnListRow) => {
    resetForm();
    setMode("view");
    await loadGrn(grn.grnId, true);
  }, [resetForm, loadGrn]);

  const handleBackToList = useCallback(() => {
    resetForm();
    setMode("list");
  }, [resetForm]);

  /* ---- Add article ---- */
  const handleAddArticle = useCallback(
    (article: Article) => {
      const artIndex = availableArticles.findIndex((a) => a.articleId === article.articleId);
      const newEntry: GrnArticleEntry = {
        localId: `${article.articleId}-${Date.now()}`,
        articleId: article.articleId,
        articleCode: article.articleCode,
        articleName: article.articleName,
        brand: article.brandName || "",
        gender: article.genderName || "",
        uom: article.uom || "PAIRS",
        sizes: buildSizeEntries(article, artIndex >= 0 ? artIndex : grnEntries.length),
      };
      setGrnEntries((prev) => [...prev, newEntry]);
    },
    [availableArticles, buildSizeEntries, grnEntries.length]
  );

  /* ---- Remove article ---- */
  const handleRemoveArticle = useCallback((localId: string) => {
    setGrnEntries((prev) => prev.filter((e) => e.localId !== localId));
  }, []);

  /* ---- Update quantity ---- */
  const handleQuantityChange = useCallback(
    (localId: string, sizeIndex: number, qty: number) => {
      setGrnEntries((prev) =>
        prev.map((entry) => {
          if (entry.localId !== localId) return entry;
          const newSizes = [...entry.sizes];
          newSizes[sizeIndex] = { ...newSizes[sizeIndex], quantity: qty };
          return { ...entry, sizes: newSizes };
        })
      );
    },
    []
  );

  /* ---- Barcode scan handler ---- */
  const handleBarcodeScan = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter" || !barcodeScan.trim()) return;
      const scanValue = barcodeScan.trim().toUpperCase();
      const matchedArticle = availableArticles.find((a) => {
        const codeClean = a.articleCode.replace(/-/g, "").toUpperCase();
        return scanValue.includes(codeClean);
      });
      if (matchedArticle) {
        const alreadyAdded = grnEntries.some((e) => e.articleId === matchedArticle.articleId);
        if (!alreadyAdded) handleAddArticle(matchedArticle);
      }
      setBarcodeScan("");
    },
    [barcodeScan, availableArticles, grnEntries, handleAddArticle]
  );

  /* ---- Totals ---- */
  const grandTotal = useMemo(
    () => grnEntries.reduce((sum, entry) => sum + entry.sizes.reduce((s, sz) => s + sz.quantity, 0), 0),
    [grnEntries]
  );

  /* ---- Build flat lines payload ---- */
  const buildLines = useCallback(() =>
    grnEntries.flatMap((entry) =>
      entry.sizes
        .filter((s) => s.quantity > 0)
        .map((s) => ({
          articleId: entry.articleId,
          euroSize: s.euroSize,
          quantity: s.quantity,
        }))
    ),
    [grnEntries]
  );

  /* ---- Validation ---- */
  const validate = (): string | null => {
    if (!warehouseId) return "Please select a warehouse.";
    if (grnEntries.length === 0) return "Please add at least one article.";
    if (grandTotal <= 0) return "Please enter quantities for at least one size.";
    return null;
  };

  /* ---- Save as Draft (create or update) ---- */
  const handleSaveDraft = async () => {
    const err = validate();
    if (err) { alert(err); return; }

    const lines = buildLines();
    if (lines.length === 0) { alert("Please enter quantities for at least one size."); return; }

    setSaving(true);
    try {
      const payload = {
        warehouseId,
        receiptDate,
        sourceType,
        referenceNo: referenceNo || undefined,
        lines,
      };

      if (mode === "edit" && editGrnId) {
        // Update existing draft
        const res = await api.put<ApiResponse<any>>(`/api/stock/grn/${editGrnId}`, payload);
        if (res.data.success) {
          setSavedGrnNumber(res.data.data?.grnNumber || savedGrnNumber);
          alert(`GRN ${res.data.data?.grnNumber} updated successfully.`);
        }
      } else {
        // Create new draft
        const res = await api.post<ApiResponse<any>>("/api/stock/grn", payload);
        if (res.data.success) {
          const data = res.data.data;
          setSavedGrnNumber(data.grnNumber);
          setEditGrnId(data.grnId);
          alert(`GRN ${data.grnNumber} saved as draft.`);
          setMode("edit"); // switch to edit mode so subsequent saves update
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save GRN draft.");
    } finally {
      setSaving(false);
    }
  };

  /* ---- Confirm Receipt ---- */
  const handleConfirmReceipt = async () => {
    const err = validate();
    if (err) { alert(err); return; }

    const lines = buildLines();
    if (lines.length === 0) { alert("Please enter quantities for at least one size."); return; }

    setConfirmSaving(true);
    try {
      const payload = { warehouseId, receiptDate, sourceType, referenceNo: referenceNo || undefined, lines };
      let grnId = editGrnId;

      if (!grnId) {
        // Step 1: Create draft first
        const createRes = await api.post<ApiResponse<any>>("/api/stock/grn", payload);
        if (!createRes.data.success) throw new Error(createRes.data.message || "Failed to create GRN");
        grnId = createRes.data.data.grnId;
        setSavedGrnNumber(createRes.data.data.grnNumber);
      } else {
        // Step 1: Update the existing draft with latest data
        await api.put<ApiResponse<any>>(`/api/stock/grn/${grnId}`, payload);
      }

      // Step 2: Confirm the GRN
      const confirmRes = await api.post<ApiResponse<any>>(`/api/stock/grn/${grnId}/confirm`);
      if (!confirmRes.data.success) throw new Error(confirmRes.data.message || "Failed to confirm GRN");

      const grnNumber = confirmRes.data.data?.grnNumber || savedGrnNumber;
      alert(`GRN ${grnNumber} confirmed. Stock has been updated.`);
      handleBackToList();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to confirm GRN.");
    } finally {
      setConfirmSaving(false);
    }
  };

  /* ---- Excluded article IDs (already added) ---- */
  const excludedArticleIds = useMemo(() => grnEntries.map((e) => e.articleId), [grnEntries]);

  const inputCls =
    "w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

  /* ===== LIST MODE ===== */
  if (mode === "list") {
    return (
      <div className="space-y-5">
        <GrnListView onNew={handleNew} onEdit={handleEdit} onView={handleView} />
        <div className="text-center py-3">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-primary">Shalive Solutions</span> RetailERP
          </p>
        </div>
      </div>
    );
  }

  /* ===== CREATE / EDIT / VIEW MODE ===== */
  const isViewMode = mode === "view" || viewReadOnly;
  const isEditMode = mode === "edit";
  const pageTitle = isViewMode ? "View GRN" : isEditMode ? "Edit GRN (Draft)" : "New Stock Receipt (GRN)";
  const displayGrnNumber = savedGrnNumber || (isViewMode || isEditMode ? "Loading..." : "Auto-assigned on save");

  return (
    <div className="space-y-5">
      {/* ===== Page Header ===== */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToList}
            className="p-2 rounded-lg border hover:bg-muted transition-colors"
            title="Back to GRN list"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Package size={22} className="text-primary" />
              {pageTitle}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Record goods received at warehouse — Size-wise entry with barcode scanning
            </p>
          </div>
        </div>

        {!isViewMode && (
          <div className="flex items-center gap-2 flex-wrap">
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">
              <Printer size={14} /> Print GRN
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">
              <Download size={14} /> Export
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
              onClick={handleConfirmReceipt}
              disabled={confirmSaving}
              className="flex items-center gap-1.5 px-5 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-semibold disabled:opacity-50 shadow-sm"
            >
              <CheckCircle size={14} />
              {confirmSaving ? "Confirming..." : "Confirm Receipt"}
            </button>
          </div>
        )}
      </div>

      {/* ===== Header Form Row ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-5 bg-card border rounded-xl shadow-sm">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">GRN Number</label>
          <input
            type="text"
            value={displayGrnNumber}
            readOnly
            className={`${inputCls} bg-muted/50 cursor-not-allowed font-mono font-semibold`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Warehouse *</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            disabled={isViewMode}
            className={`${inputCls} ${isViewMode ? "bg-muted/50 cursor-not-allowed" : ""}`}
          >
            <option value="">Select Warehouse</option>
            {warehouses.map((w) => (
              <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Receipt Date</label>
          <input
            type="date"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            readOnly={isViewMode}
            className={`${inputCls} ${isViewMode ? "bg-muted/50 cursor-not-allowed" : ""}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Source Type</label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            disabled={isViewMode}
            className={`${inputCls} ${isViewMode ? "bg-muted/50 cursor-not-allowed" : ""}`}
          >
            <option value="Purchase">Purchase</option>
            <option value="Production">Production</option>
            <option value="Return">Return</option>
            <option value="Transfer">Transfer</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Reference No</label>
          <input
            type="text"
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            readOnly={isViewMode}
            placeholder="PO/Invoice no."
            className={`${inputCls} ${isViewMode ? "bg-muted/50 cursor-not-allowed" : ""}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Barcode Scan</label>
          <div className="relative">
            <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={barcodeScan}
              onChange={(e) => setBarcodeScan(e.target.value)}
              onKeyDown={handleBarcodeScan}
              disabled={isViewMode}
              placeholder="Scan barcode + Enter..."
              className={`${inputCls} pl-10`}
            />
          </div>
        </div>
      </div>

      {/* ===== Article Entries ===== */}
      {grnEntries.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <Package size={48} className="mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-1">No articles added yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Add articles using the button below or scan a barcode to get started.
          </p>
          {!isViewMode && (
            <div className="max-w-sm mx-auto">
              <ArticleSelector articles={availableArticles} onSelect={handleAddArticle} excludeIds={excludedArticleIds} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {grnEntries.map((entry) => (
            <SizeRunCard
              key={entry.localId}
              entry={entry}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemoveArticle}
              readOnly={isViewMode}
            />
          ))}
          {!isViewMode && (
            <div className="max-w-md">
              <ArticleSelector articles={availableArticles} onSelect={handleAddArticle} excludeIds={excludedArticleIds} />
            </div>
          )}
        </div>
      )}

      {/* ===== Grand Total Footer ===== */}
      {grnEntries.length > 0 && (
        <div className="flex items-center justify-end p-4 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Grand Total:</span>
            <span className="text-2xl font-bold text-primary">{grandTotal}</span>
            <span className="text-sm text-muted-foreground">units</span>
          </div>
        </div>
      )}

      <div className="text-center py-3">
        <p className="text-xs text-muted-foreground">
          Powered by <span className="font-semibold text-primary">Shalive Solutions</span> RetailERP
        </p>
      </div>
    </div>
  );
}
