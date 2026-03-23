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
  sizeChartId?: string;
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

/* ========== Constants ========== */

// Default size chart when API is not available
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
function generateGrnNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 900) + 100).padStart(3, "0");
  return `GRN-${year}-${seq}`;
}

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
                      <span className="text-sm font-medium">
                        {article.articleName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {article.brandName}
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

/* ========== Size Run Card ========== */
function SizeRunCard({
  entry,
  entryIndex,
  onQuantityChange,
  onRemove,
}: {
  entry: GrnArticleEntry;
  entryIndex: number;
  onQuantityChange: (localId: string, sizeIndex: number, qty: number) => void;
  onRemove: (localId: string) => void;
}) {
  const totalQty = entry.sizes.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Card Header */}
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
          <button
            onClick={() => onRemove(entry.localId)}
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
            title="Remove article"
          >
            <Trash2 size={16} className="text-destructive" />
          </button>
        </div>
      </div>

      {/* Size Chart Title */}
      <div className="text-center py-2 bg-muted/20 border-b">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Men&apos;s Size Run Chart
        </p>
      </div>

      {/* Size Run Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-muted/30">
              <th className="px-3 py-2 text-left font-bold text-primary border-r border-border/50 w-28 whitespace-nowrap">
                IND-UK-SIZE
              </th>
              {entry.sizes.map((s, idx) => (
                <th
                  key={idx}
                  className="px-2 py-2 text-center font-bold text-primary border-r border-border/50 whitespace-nowrap"
                >
                  {s.euroSize}-{s.ukSize}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* UK Size Row */}
            <tr className="border-b border-border/30">
              <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50">
                UK SIZE
              </td>
              {entry.sizes.map((s, idx) => (
                <td
                  key={idx}
                  className="px-2 py-1.5 text-center border-r border-border/50"
                >
                  {s.ukSize}
                </td>
              ))}
            </tr>
            {/* IND Size Row */}
            <tr className="border-b border-border/30">
              <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50">
                IND SIZE
              </td>
              {entry.sizes.map((s, idx) => (
                <td
                  key={idx}
                  className="px-2 py-1.5 text-center border-r border-border/50"
                >
                  {s.indSize}
                </td>
              ))}
            </tr>
            {/* USA Size Row */}
            <tr className="border-b border-border/30">
              <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50">
                USA SIZE
              </td>
              {entry.sizes.map((s, idx) => (
                <td
                  key={idx}
                  className="px-2 py-1.5 text-center border-r border-border/50"
                >
                  {s.usaSize}
                </td>
              ))}
            </tr>
            {/* EURO Size Row */}
            <tr className="border-b border-border/30">
              <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50">
                EURO SIZE
              </td>
              {entry.sizes.map((s, idx) => (
                <td
                  key={idx}
                  className="px-2 py-1.5 text-center border-r border-border/50"
                >
                  {s.euroSize}
                </td>
              ))}
            </tr>
            {/* CM Row */}
            <tr className="border-b border-border/30">
              <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50">
                CM
              </td>
              {entry.sizes.map((s, idx) => (
                <td
                  key={idx}
                  className="px-2 py-1.5 text-center border-r border-border/50"
                >
                  {s.cm}
                </td>
              ))}
            </tr>
            {/* INCH Row */}
            <tr className="border-b border-border/30">
              <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50">
                INCH
              </td>
              {entry.sizes.map((s, idx) => (
                <td
                  key={idx}
                  className="px-2 py-1.5 text-center border-r border-border/50"
                >
                  {s.inch}
                </td>
              ))}
            </tr>
            {/* EAN CODE Row */}
            <tr className="border-b border-border/30">
              <td className="px-3 py-2 font-semibold text-muted-foreground border-r border-border/50 bg-amber-50">
                EAN CODE
              </td>
              {entry.sizes.map((s, idx) => (
                <td
                  key={idx}
                  className="px-1 py-2 text-center border-r border-border/50 bg-amber-50"
                >
                  <span className="font-mono text-[10px] leading-tight block text-amber-800">
                    {s.eanCode}
                  </span>
                </td>
              ))}
            </tr>
            {/* STYLE CODE Row */}
            <tr className="border-b border-border/30">
              <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50">
                STYLE CODE
              </td>
              {entry.sizes.map((s, idx) => (
                <td
                  key={idx}
                  className="px-2 py-1.5 text-center font-mono text-[10px] border-r border-border/50"
                >
                  {s.styleCode}
                </td>
              ))}
            </tr>
            {/* QUANTITY Row */}
            <tr>
              <td className="px-3 py-2 font-bold text-foreground border-r border-border/50 bg-amber-50">
                QNTY
              </td>
              {entry.sizes.map((s, idx) => (
                <td
                  key={idx}
                  className="px-1 py-1.5 text-center border-r border-border/50 bg-amber-50"
                >
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
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between px-5 py-3 bg-muted/20 border-t">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            TOTAL QNTY:{" "}
            <span className="font-bold text-foreground text-base">{totalQty}</span>
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          UOM: <span className="font-bold text-foreground">{entry.uom}</span>
        </span>
      </div>
    </div>
  );
}

/* ========== MAIN PAGE ========== */
export default function StockReceiptPage() {
  /* ---- Reference data ---- */
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [availableArticles, setAvailableArticles] = useState<Article[]>([]);
  const [sizeChart, setSizeChart] = useState<SizeChartEntry[]>(DEFAULT_SIZE_CHART);

  /* ---- GRN header state ---- */
  const [grnNumber] = useState(() => generateGrnNumber());
  const [warehouseId, setWarehouseId] = useState("");
  const [receiptDate, setReceiptDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [barcodeScan, setBarcodeScan] = useState("");

  /* ---- GRN article entries ---- */
  const [grnEntries, setGrnEntries] = useState<GrnArticleEntry[]>([]);

  /* ---- UI state ---- */
  const [saving, setSaving] = useState(false);
  const [confirmSaving, setConfirmSaving] = useState(false);

  /* ---- Fetch reference data ---- */
  const fetchReferenceData = useCallback(async () => {
    try {
      const [whRes, artRes] = await Promise.all([
        api.get<ApiResponse<any>>("/api/warehouses", { params: { pageSize: 200 } }),
        api.get<ApiResponse<any>>("/api/articles", { params: { pageSize: 500 } }),
      ]);
      if (whRes.data.success) setWarehouses(whRes.data.data?.items || []);
      if (artRes.data.success) setAvailableArticles(artRes.data.data?.items || []);
    } catch {
      // silently fail
    }

    // Try to fetch size chart
    try {
      const scRes = await api.get<ApiResponse<any>>("/api/sizecharts", {
        params: { pageSize: 200 },
      });
      if (scRes.data.success) {
        const items = scRes.data.data?.items || scRes.data.data || [];
        if (items.length > 0) {
          setSizeChart(
            items.map((item: any) => ({
              euroSize: item.euroSize ?? item.euro,
              ukSize: String(item.ukSize ?? item.uk ?? ""),
              indSize: String(item.indSize ?? item.ind ?? ""),
              usaSize: String(item.usaSize ?? item.usa ?? ""),
              cm: String(item.cm ?? ""),
              inch: String(item.inch ?? ""),
            }))
          );
        }
      }
    } catch {
      // Use default size chart
    }
  }, []);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  /* ---- Build size entries for an article ---- */
  const buildSizeEntries = useCallback(
    (article: Article, artGlobalIndex: number): GrnSizeEntry[] => {
      return sizeChart.map((sc, sizeIdx) => ({
        euroSize: sc.euroSize,
        ukSize: sc.ukSize,
        indSize: sc.indSize,
        usaSize: sc.usaSize,
        cm: sc.cm,
        inch: sc.inch,
        eanCode: generateEan13(artGlobalIndex, sizeIdx),
        styleCode: article.articleCode,
        quantity: 0,
      }));
    },
    [sizeChart]
  );

  /* ---- Add article ---- */
  const handleAddArticle = useCallback(
    (article: Article) => {
      const artIndex = availableArticles.findIndex(
        (a) => a.articleId === article.articleId
      );
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
      // Try to match barcode to an article
      const scanValue = barcodeScan.trim().toUpperCase();
      const matchedArticle = availableArticles.find((a) => {
        const codeClean = a.articleCode.replace(/-/g, "").toUpperCase();
        return scanValue.includes(codeClean);
      });
      if (matchedArticle) {
        // Check if article already added
        const alreadyAdded = grnEntries.some(
          (e) => e.articleId === matchedArticle.articleId
        );
        if (!alreadyAdded) {
          handleAddArticle(matchedArticle);
        }
      }
      setBarcodeScan("");
    },
    [barcodeScan, availableArticles, grnEntries, handleAddArticle]
  );

  /* ---- Totals ---- */
  const articleTotals = useMemo(
    () =>
      grnEntries.map((entry) =>
        entry.sizes.reduce((sum, s) => sum + s.quantity, 0)
      ),
    [grnEntries]
  );

  const grandTotal = useMemo(
    () => articleTotals.reduce((sum, t) => sum + t, 0),
    [articleTotals]
  );

  /* ---- Save as Draft ---- */
  const handleSaveDraft = async () => {
    if (!warehouseId) {
      alert("Please select a warehouse.");
      return;
    }
    if (grnEntries.length === 0) {
      alert("Please add at least one article.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/stock/grn", {
        grnNumber,
        warehouseId,
        receiptDate,
        status: "DRAFT",
        entries: grnEntries.map((entry) => ({
          articleId: entry.articleId,
          sizes: entry.sizes
            .filter((s) => s.quantity > 0)
            .map((s) => ({
              euroSize: s.euroSize,
              quantity: s.quantity,
              eanCode: s.eanCode,
            })),
          totalQuantity: entry.sizes.reduce((sum, s) => sum + s.quantity, 0),
        })),
        grandTotal,
      });
      alert("GRN saved as draft successfully.");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save GRN draft.");
    } finally {
      setSaving(false);
    }
  };

  /* ---- Confirm Receipt ---- */
  const handleConfirmReceipt = async () => {
    if (!warehouseId) {
      alert("Please select a warehouse.");
      return;
    }
    if (grnEntries.length === 0) {
      alert("Please add at least one article.");
      return;
    }
    if (grandTotal <= 0) {
      alert("Total quantity must be greater than zero.");
      return;
    }
    setConfirmSaving(true);
    try {
      await api.post("/api/stock/grn", {
        grnNumber,
        warehouseId,
        receiptDate,
        status: "CONFIRMED",
        entries: grnEntries.map((entry) => ({
          articleId: entry.articleId,
          sizes: entry.sizes
            .filter((s) => s.quantity > 0)
            .map((s) => ({
              euroSize: s.euroSize,
              quantity: s.quantity,
              eanCode: s.eanCode,
            })),
          totalQuantity: entry.sizes.reduce((sum, s) => sum + s.quantity, 0),
        })),
        grandTotal,
      });
      alert("GRN confirmed and stock updated successfully.");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to confirm GRN.");
    } finally {
      setConfirmSaving(false);
    }
  };

  /* ---- Excluded article IDs (already added) ---- */
  const excludedArticleIds = useMemo(
    () => grnEntries.map((e) => e.articleId),
    [grnEntries]
  );

  const inputCls =
    "w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

  return (
    <div className="space-y-5">
      {/* ===== Page Header ===== */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Package size={22} className="text-primary" />
            Stock Receipt (GRN)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Record goods received at warehouse &mdash; Size-wise entry with barcode scanning
          </p>
        </div>
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
      </div>

      {/* ===== Header Form Row ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-card border rounded-xl shadow-sm">
        {/* GRN Number */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
            GRN Number
          </label>
          <input
            type="text"
            value={grnNumber}
            readOnly
            className={`${inputCls} bg-muted/50 cursor-not-allowed font-mono font-semibold`}
          />
        </div>

        {/* Warehouse */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
            Warehouse *
          </label>
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

        {/* Receipt Date */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
            Receipt Date
          </label>
          <input
            type="date"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Barcode Scan */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
            Barcode Scan
          </label>
          <div className="relative">
            <Barcode
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={barcodeScan}
              onChange={(e) => setBarcodeScan(e.target.value)}
              onKeyDown={handleBarcodeScan}
              placeholder="Scan or type barcode + Enter..."
              className={`${inputCls} pl-10`}
            />
          </div>
        </div>
      </div>

      {/* ===== Article Entries ===== */}
      {grnEntries.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <Package size={48} className="mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-1">
            No articles added yet
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Add articles using the button below or scan a barcode to get started.
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
          {grnEntries.map((entry, idx) => (
            <SizeRunCard
              key={entry.localId}
              entry={entry}
              entryIndex={idx}
              onQuantityChange={handleQuantityChange}
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

      {/* ===== Grand Total Footer ===== */}
      {grnEntries.length > 0 && (
        <div className="flex items-center justify-end p-4 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Grand Total:</span>
            <span className="text-2xl font-bold text-primary">
              {grandTotal}
            </span>
            <span className="text-sm text-muted-foreground">units</span>
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
