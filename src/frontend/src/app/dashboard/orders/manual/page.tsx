"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse, type PagedResult } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Plus,
  Trash2,
  Eye,
  Edit2,
  Check,
  Truck,
  FileText,
  X,
  Search,
  ChevronDown,
  Image as ImageIcon,
  Package,
} from "lucide-react";

/* ================================================================
   Types
   ================================================================ */

interface Order {
  orderId: string;
  orderNo: string;
  orderDate: string;
  clientId: string;
  clientName: string;
  storeId: string;
  storeName: string;
  warehouseId: string;
  warehouseName: string;
  totalLines: number;
  totalQuantity: number;
  totalAmount: number;
  status: string;
  notes?: string;
}

interface OrderDetail extends Order {
  articles: OrderArticleDetail[];
}

interface OrderArticleDetail {
  articleId: string;
  articleCode: string;
  articleName: string;
  color: string;
  mrp: number;
  hsnCode: string;
  imageUrl?: string;
  totalQuantity: number;
  totalAmount: number;
  sizeQuantities: { euroSize: number; ukSize: string; quantity: number }[];
}

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

interface SizeRowData {
  label: string;
  euroSize: number;
  ukSize: string;
  warehouseOpn: number;
  customerOpn: number;
  allocation: number;
  warehouseCls: number;
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

interface InvoiceFormData {
  invoiceDate: string;
  marginPercent: string;
  poNumber: string;
  poDate: string;
  cartonBoxes: string;
  transportMode: string;
  logistic: string;
  vehicleNo: string;
  isInterState: boolean;
  notes: string;
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

const STATUS_TABS = ["All", "DRAFT", "CONFIRMED", "DISPATCHED", "CANCELLED"];

const TRANSPORT_MODES = ["Road", "Rail", "Air", "Ship", "Courier"];

/* ================================================================
   Helpers
   ================================================================ */

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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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
        type="button"
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
                <div className="p-4 text-sm text-muted-foreground text-center">No articles available</div>
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
                    <div>
                      <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-2">
                        {article.articleCode}
                      </span>
                      <span className="text-sm font-medium">{article.articleName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{article.color}</span>
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
   Order Article Card
   ================================================================ */

function OrderArticleCard({
  entry,
  onAllocationChange,
  onRemove,
}: {
  entry: OrderArticleEntry;
  onAllocationChange: (localId: string, sizeIndex: number, qty: number) => void;
  onRemove: (localId: string) => void;
}) {
  const totalPairs = entry.sizeData.reduce((sum, s) => sum + s.allocation, 0);
  const totalAmount = totalPairs * entry.mrp;

  return (
    <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Article Info Header */}
      <div className="flex items-start gap-5 p-5 border-b bg-muted/20">
        <div className="w-20 h-20 bg-muted rounded-xl flex items-center justify-center shrink-0 border">
          {entry.imageUrl ? (
            <img src={entry.imageUrl} alt={entry.articleName} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <ImageIcon size={28} className="text-muted-foreground/40" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">HSN Code</p>
              <p className="text-lg font-bold text-foreground font-mono">{entry.hsnCode || "N/A"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Article</p>
              <p className="text-sm font-semibold text-foreground">{entry.articleName}</p>
              <p className="text-xs text-muted-foreground font-mono">{entry.articleCode}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Colour</p>
              <p className="text-sm font-semibold text-foreground">{entry.color || "N/A"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">MRP</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(entry.mrp)}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(entry.localId)}
          className="p-2 rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
          title="Remove article"
        >
          <Trash2 size={16} className="text-destructive" />
        </button>
      </div>

      {/* Section heading */}
      <div className="text-center py-2.5 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white">Inventory of Warehouse</p>
      </div>

      {/* Size Run Table */}
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
              {/* Row 1: Warehouse Opening SOH */}
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300 border-r border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-950/30 whitespace-nowrap">
                  Ware House OPN-SOH
                </td>
                {entry.sizeData.map((s) => (
                  <td key={`wh-opn-${s.label}`} className="px-2 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-950/30">
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{s.warehouseOpn}</span>
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center bg-emerald-50 dark:bg-emerald-950/30">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {entry.sizeData.reduce((sum, s) => sum + s.warehouseOpn, 0)}
                  </span>
                </td>
              </tr>

              {/* Row 2: Customer Opening SOH */}
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-blue-800 dark:text-blue-300 border-r border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-950/30 whitespace-nowrap">
                  Customer OPN-SOH
                </td>
                {entry.sizeData.map((s) => (
                  <td key={`cust-opn-${s.label}`} className="px-2 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-950/30">
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">{s.customerOpn}</span>
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center bg-blue-50 dark:bg-blue-950/30">
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                    {entry.sizeData.reduce((sum, s) => sum + s.customerOpn, 0)}
                  </span>
                </td>
              </tr>

              {/* Row 3: Allocation (editable) */}
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-300 border-r border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-950/30 whitespace-nowrap">
                  Allocation
                </td>
                {entry.sizeData.map((s, idx) => (
                  <td key={`alloc-${s.label}`} className="px-1 py-1.5 text-center border-r border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-950/30">
                    <input
                      type="number"
                      min={0}
                      value={s.allocation || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        onAllocationChange(entry.localId, idx, isNaN(val) ? 0 : val);
                      }}
                      className={[
                        "w-14 text-center text-sm font-semibold py-1 px-1 rounded border focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white dark:bg-slate-900",
                        s.allocation > s.warehouseOpn && s.warehouseOpn > 0
                          ? "border-red-400 text-red-600"
                          : "border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300",
                      ].join(" ")}
                    />
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center bg-amber-50 dark:bg-amber-950/30">
                  <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    {entry.sizeData.reduce((sum, s) => sum + s.allocation, 0)}
                  </span>
                </td>
              </tr>

              {/* Row 4: Warehouse Closing SOH */}
              <tr>
                <td className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 whitespace-nowrap">
                  Ware House CLS-SOH
                </td>
                {entry.sizeData.map((s) => (
                  <td key={`wh-cls-${s.label}`} className="px-2 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <span className={`text-sm font-semibold ${s.warehouseCls < 0 ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-400"}`}>
                      {s.warehouseCls}
                    </span>
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center bg-slate-50 dark:bg-slate-800/50">
                  <span className={`text-sm font-bold ${entry.sizeData.reduce((sum, s) => sum + s.warehouseCls, 0) < 0 ? "text-red-600" : "text-slate-600 dark:text-slate-400"}`}>
                    {entry.sizeData.reduce((sum, s) => sum + s.warehouseCls, 0)}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Footer: totals */}
      <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-t">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wider mr-2">Total Pairs</span>
            <span className="font-bold text-foreground text-base">{totalPairs}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wider mr-2">Amount</span>
            <span className="font-bold text-primary text-base">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   View Order Detail Modal Content
   ================================================================ */

function OrderDetailContent({ order }: { order: OrderDetail }) {
  const grandTotal = order.articles.reduce((sum, a) => sum + a.totalAmount, 0);
  const grandQty = order.articles.reduce((sum, a) => sum + a.totalQuantity, 0);

  return (
    <div className="space-y-4 pt-2">
      {/* Header meta */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Order No</p>
          <p className="text-sm font-bold font-mono">{order.orderNo}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Date</p>
          <p className="text-sm font-medium">{formatDate(order.orderDate)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</p>
          <StatusBadge status={order.status} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Client</p>
          <p className="text-sm font-medium">{order.clientName}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Store</p>
          <p className="text-sm font-medium">{order.storeName}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Warehouse</p>
          <p className="text-sm font-medium">{order.warehouseName}</p>
        </div>
      </div>

      {/* Articles */}
      <div className="space-y-3">
        {order.articles.map((article) => (
          <div key={article.articleId} className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b">
              <div>
                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-2">
                  {article.articleCode}
                </span>
                <span className="text-sm font-semibold">{article.articleName}</span>
                <span className="text-xs text-muted-foreground ml-2">({article.color})</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">MRP {formatCurrency(article.mrp)}</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(article.totalAmount)}</p>
              </div>
            </div>
            <div className="px-4 py-3 overflow-x-auto">
              <div className="flex gap-3 min-w-max">
                {article.sizeQuantities.map((sq) => (
                  <div key={sq.euroSize} className="text-center">
                    <p className="text-[10px] text-muted-foreground font-semibold">{sq.euroSize}-{sq.ukSize}</p>
                    <p className={`text-sm font-bold ${sq.quantity > 0 ? "text-foreground" : "text-muted-foreground/40"}`}>
                      {sq.quantity}
                    </p>
                  </div>
                ))}
                <div className="text-center pl-3 border-l">
                  <p className="text-[10px] text-muted-foreground font-semibold">Total</p>
                  <p className="text-sm font-bold text-primary">{article.totalQuantity}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grand total */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
        <span className="text-sm font-semibold text-muted-foreground">Grand Total</span>
        <div className="text-right">
          <span className="text-xs text-muted-foreground mr-3">{grandQty} pairs</span>
          <span className="text-base font-bold text-primary">{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Invoice Generation Modal Content
   ================================================================ */

function InvoiceFormContent({
  order,
  onSubmit,
  onClose,
}: {
  order: Order;
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<InvoiceFormData>({
    invoiceDate: todayIso(),
    marginPercent: "",
    poNumber: "",
    poDate: "",
    cartonBoxes: "",
    transportMode: "Road",
    logistic: "",
    vehicleNo: "",
    isInterState: false,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof InvoiceFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Invoice Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={form.invoiceDate}
            onChange={(e) => set("invoiceDate", e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Margin %
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            placeholder="e.g. 15.00"
            value={form.marginPercent}
            onChange={(e) => set("marginPercent", e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            PO Number
          </label>
          <input
            type="text"
            placeholder="Purchase order number"
            value={form.poNumber}
            onChange={(e) => set("poNumber", e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            PO Date
          </label>
          <input
            type="date"
            value={form.poDate}
            onChange={(e) => set("poDate", e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Carton Boxes
          </label>
          <input
            type="number"
            min={0}
            placeholder="Number of boxes"
            value={form.cartonBoxes}
            onChange={(e) => set("cartonBoxes", e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Transport Mode
          </label>
          <select
            value={form.transportMode}
            onChange={(e) => set("transportMode", e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {TRANSPORT_MODES.map((mode) => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Logistic Partner
          </label>
          <input
            type="text"
            placeholder="e.g. Blue Dart, DTDC"
            value={form.logistic}
            onChange={(e) => set("logistic", e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Vehicle / LR No
          </label>
          <input
            type="text"
            placeholder="Vehicle or LR number"
            value={form.vehicleNo}
            onChange={(e) => set("vehicleNo", e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Notes
        </label>
        <textarea
          rows={3}
          placeholder="Any additional notes..."
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.isInterState}
          onChange={(e) => set("isInterState", e.target.checked)}
          className="w-4 h-4 rounded border border-input accent-primary"
        />
        <span className="text-sm font-medium">Inter-State Supply (IGST applicable)</span>
      </label>

      <div className="flex gap-3 pt-2 border-t">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2.5 text-sm border rounded-lg hover:bg-muted font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
              Generating...
            </>
          ) : (
            <>
              <FileText size={14} />
              Generate Invoice
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/* ================================================================
   Main Page
   ================================================================ */

export default function ManualOrderPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  /* ---- Mode ---- */
  const [mode, setMode] = useState<"list" | "form">("list");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  /* ---- List state ---- */
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [listLoading, setListLoading] = useState(false);

  /* ---- View detail modal ---- */
  const [viewOrder, setViewOrder] = useState<OrderDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  /* ---- Invoice modal ---- */
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  /* ---- Form state ---- */
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);

  const [orderDate, setOrderDate] = useState(todayIso());
  const [clientId, setClientId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [articleEntries, setArticleEntries] = useState<OrderArticleEntry[]>([]);
  const [formSaving, setFormSaving] = useState(false);

  const PAGE_SIZE = 25;

  /* ================================================================
     List: fetch orders
     ================================================================ */

  const fetchOrders = useCallback(async () => {
    setListLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: pageNumber,
        pageSize: PAGE_SIZE,
      };
      if (search) params.search = search;
      if (statusFilter !== "All") params.status = statusFilter;

      const res = await api.get<ApiResponse<PagedResult<Order>>>("/api/orders", { params });
      if (res.data.success && res.data.data) {
        setOrders(res.data.data.items);
        setTotalCount(res.data.data.totalCount);
      }
    } catch {
      showToast("error", "Failed to load orders");
    } finally {
      setListLoading(false);
    }
  }, [pageNumber, search, statusFilter, showToast]);

  useEffect(() => {
    if (mode === "list") fetchOrders();
  }, [mode, fetchOrders]);

  /* ================================================================
     List: actions
     ================================================================ */

  const handleViewOrder = async (order: Order) => {
    setViewLoading(true);
    setViewModalOpen(true);
    setViewOrder(null);
    try {
      const res = await api.get<ApiResponse<OrderDetail>>(`/api/orders/${order.orderId}`);
      if (res.data.success && res.data.data) {
        setViewOrder(res.data.data);
      }
    } catch {
      showToast("error", "Failed to load order details");
      setViewModalOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const handleEditOrder = async (order: Order) => {
    setEditingOrderId(order.orderId);
    await loadMasters();
    // Load order data into form
    setOrderDate(order.orderDate?.slice(0, 10) || todayIso());
    setClientId(order.clientId);
    setWarehouseId(order.warehouseId);
    setNotes(order.notes || "");

    // Fetch stores for the client
    try {
      const storeRes = await api.get<ApiResponse<PagedResult<StoreInfo>>>(
        `/api/clients/${order.clientId}/stores?pageSize=200`
      );
      if (storeRes.data.success && storeRes.data.data) {
        setStores(storeRes.data.data.items);
      }
    } catch {
      // non-fatal
    }
    setStoreId(order.storeId);

    // Load article entries from order detail
    try {
      const detailRes = await api.get<ApiResponse<OrderDetail>>(`/api/orders/${order.orderId}`);
      if (detailRes.data.success && detailRes.data.data) {
        const entries: OrderArticleEntry[] = detailRes.data.data.articles.map((a) => ({
          localId: a.articleId,
          articleId: a.articleId,
          articleCode: a.articleCode,
          articleName: a.articleName,
          color: a.color,
          mrp: a.mrp,
          hsnCode: a.hsnCode,
          imageUrl: a.imageUrl || "",
          loadingStock: false,
          sizeData: SIZE_DEFINITIONS.map((def) => {
            const sq = a.sizeQuantities.find((s) => s.euroSize === def.euroSize);
            return {
              label: def.label,
              euroSize: def.euroSize,
              ukSize: def.ukSize,
              warehouseOpn: 0,
              customerOpn: 0,
              allocation: sq?.quantity ?? 0,
              warehouseCls: -(sq?.quantity ?? 0),
            };
          }),
        }));
        setArticleEntries(entries);
      }
    } catch {
      setArticleEntries([]);
    }

    setMode("form");
  };

  const handleConfirmOrder = async (order: Order) => {
    const ok = await confirm({
      title: "Confirm Order",
      message: `Confirm order ${order.orderNo}? This cannot be undone.`,
      confirmLabel: "Yes, Confirm",
      variant: "default",
    });
    if (!ok) return;
    try {
      await api.put(`/api/orders/${order.orderId}/confirm`);
      showToast("success", "Order confirmed");
      fetchOrders();
    } catch {
      showToast("error", "Failed to confirm order");
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    const ok = await confirm({
      title: "Delete Order",
      message: `Delete order ${order.orderNo}? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/orders/${order.orderId}`);
      showToast("success", "Order deleted");
      fetchOrders();
    } catch {
      showToast("error", "Failed to delete order");
    }
  };

  const handleDispatchOrder = async (order: Order) => {
    const ok = await confirm({
      title: "Dispatch Order",
      message: `Mark order ${order.orderNo} as dispatched?`,
      confirmLabel: "Dispatch",
      variant: "default",
    });
    if (!ok) return;
    try {
      await api.put(`/api/orders/${order.orderId}/dispatch`);
      showToast("success", "Order dispatched");
      fetchOrders();
    } catch {
      showToast("error", "Failed to dispatch order");
    }
  };

  const handleCancelOrder = async (order: Order) => {
    const ok = await confirm({
      title: "Cancel Order",
      message: `Cancel order ${order.orderNo}?`,
      confirmLabel: "Cancel Order",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.put(`/api/orders/${order.orderId}/cancel`);
      showToast("success", "Order cancelled");
      fetchOrders();
    } catch {
      showToast("error", "Failed to cancel order");
    }
  };

  const handleOpenInvoiceModal = (order: Order) => {
    setInvoiceOrder(order);
    setInvoiceModalOpen(true);
  };

  const handleGenerateInvoice = async (formData: InvoiceFormData) => {
    if (!invoiceOrder) return;

    // Fetch the full order for lines
    let detail: OrderDetail | null = null;
    try {
      const res = await api.get<ApiResponse<OrderDetail>>(`/api/orders/${invoiceOrder.orderId}`);
      if (res.data.success && res.data.data) detail = res.data.data;
    } catch {
      showToast("error", "Failed to load order details for invoice");
      return;
    }

    const marginPct = parseFloat(formData.marginPercent) || 0;

    const payload = {
      orderId: invoiceOrder.orderId,
      orderNumber: invoiceOrder.orderNo,
      clientId: invoiceOrder.clientId,
      storeId: invoiceOrder.storeId,
      invoiceDate: formData.invoiceDate,
      isInterState: formData.isInterState,
      poNumber: formData.poNumber,
      poDate: formData.poDate || null,
      cartonBoxes: parseInt(formData.cartonBoxes, 10) || 0,
      logistic: formData.logistic,
      transportMode: formData.transportMode,
      vehicleNo: formData.vehicleNo,
      notes: formData.notes,
      lines: (detail?.articles ?? []).map((a) => ({
        articleId: a.articleId,
        sku: a.articleCode,
        articleName: a.articleName,
        description: a.articleName,
        hsnCode: a.hsnCode,
        color: a.color,
        mrp: a.mrp,
        quantity: a.totalQuantity,
        marginPercent: marginPct,
        sizeBreakdownJson: JSON.stringify(a.sizeQuantities),
        uom: "Pairs",
      })),
    };

    try {
      await api.post("/api/invoices", payload);
      showToast("success", "Invoice generated successfully");
      setInvoiceModalOpen(false);
      setInvoiceOrder(null);
    } catch {
      showToast("error", "Failed to generate invoice");
      throw new Error("invoice_failed");
    }
  };

  /* ================================================================
     Form: master data
     ================================================================ */

  const loadMasters = useCallback(async () => {
    if (warehouses.length > 0 && clients.length > 0 && articles.length > 0) return;
    setMasterLoading(true);
    try {
      const [whRes, clientRes, artRes] = await Promise.all([
        api.get<ApiResponse<PagedResult<Warehouse>>>("/api/warehouses?pageSize=200"),
        api.get<ApiResponse<PagedResult<Client>>>("/api/clients?pageSize=200"),
        api.get<ApiResponse<PagedResult<Article>>>("/api/articles?pageSize=500"),
      ]);
      if (whRes.data.success && whRes.data.data) setWarehouses(whRes.data.data.items);
      if (clientRes.data.success && clientRes.data.data) setClients(clientRes.data.data.items);
      if (artRes.data.success && artRes.data.data) setArticles(artRes.data.data.items);
    } catch {
      showToast("error", "Failed to load master data");
    } finally {
      setMasterLoading(false);
    }
  }, [warehouses.length, clients.length, articles.length, showToast]);

  /* When client changes, reload stores */
  useEffect(() => {
    if (!clientId) {
      setStores([]);
      setStoreId("");
      return;
    }
    (async () => {
      try {
        const res = await api.get<ApiResponse<PagedResult<StoreInfo>>>(
          `/api/clients/${clientId}/stores?pageSize=200`
        );
        if (res.data.success && res.data.data) {
          setStores(res.data.data.items);
        }
      } catch {
        setStores([]);
      }
      setStoreId("");
    })();
  }, [clientId]);

  /* When warehouse changes, refresh stock for existing article entries */
  useEffect(() => {
    if (!warehouseId || articleEntries.length === 0) return;
    articleEntries.forEach((entry) => {
      loadStockForEntry(entry.localId, entry.articleId, warehouseId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]);

  const loadStockForEntry = async (localId: string, articleId: string, whId: string) => {
    if (!whId) return;
    setArticleEntries((prev) =>
      prev.map((e) => (e.localId === localId ? { ...e, loadingStock: true } : e))
    );
    try {
      const res = await api.get<ApiResponse<{ sizes: { euroSize: number; openingStock: number; closingStock: number }[] }>>(
        `/api/stock/${whId}/${articleId}`
      );
      const sizes = res.data.data?.sizes ?? [];
      setArticleEntries((prev) =>
        prev.map((e) => {
          if (e.localId !== localId) return e;
          return {
            ...e,
            loadingStock: false,
            sizeData: e.sizeData.map((sd) => {
              const match = sizes.find((s) => s.euroSize === sd.euroSize);
              const warehouseOpn = match?.openingStock ?? 0;
              return {
                ...sd,
                warehouseOpn,
                warehouseCls: warehouseOpn - sd.allocation,
              };
            }),
          };
        })
      );
    } catch {
      setArticleEntries((prev) =>
        prev.map((e) => (e.localId !== localId ? e : { ...e, loadingStock: false }))
      );
    }
  };

  const handleAddArticle = async (article: Article) => {
    const localId = `${article.articleId}-${Date.now()}`;
    const entry: OrderArticleEntry = {
      localId,
      articleId: article.articleId,
      articleCode: article.articleCode,
      articleName: article.articleName,
      color: article.color,
      mrp: article.mrp,
      hsnCode: article.hsnCode || "",
      imageUrl: article.imageUrl || "",
      sizeData: buildEmptySizeData(),
      loadingStock: false,
    };
    setArticleEntries((prev) => [...prev, entry]);
    if (warehouseId) {
      await loadStockForEntry(localId, article.articleId, warehouseId);
    }
  };

  const handleAllocationChange = (localId: string, sizeIndex: number, qty: number) => {
    setArticleEntries((prev) =>
      prev.map((e) => {
        if (e.localId !== localId) return e;
        const updated = e.sizeData.map((sd, idx) => {
          if (idx !== sizeIndex) return sd;
          return { ...sd, allocation: qty, warehouseCls: sd.warehouseOpn - qty };
        });
        return { ...e, sizeData: updated };
      })
    );
  };

  const handleRemoveArticle = (localId: string) => {
    setArticleEntries((prev) => prev.filter((e) => e.localId !== localId));
  };

  /* ================================================================
     Form: open new order
     ================================================================ */

  const handleNewOrder = async () => {
    setEditingOrderId(null);
    setOrderDate(todayIso());
    setClientId("");
    setStoreId("");
    setWarehouseId("");
    setNotes("");
    setArticleEntries([]);
    await loadMasters();
    setMode("form");
  };

  /* ================================================================
     Form: save
     ================================================================ */

  const buildOrderPayload = () => ({
    clientId,
    storeId,
    warehouseId,
    orderDate,
    notes,
    articles: articleEntries.map((e) => ({
      articleId: e.articleId,
      color: e.color,
      hsnCode: e.hsnCode,
      mrp: e.mrp,
      sizeQuantities: e.sizeData
        .filter((s) => s.allocation > 0)
        .map((s) => ({ euroSize: s.euroSize, quantity: s.allocation })),
    })),
  });

  const handleSaveDraft = async () => {
    if (!clientId || !storeId || !warehouseId) {
      showToast("warning", "Please fill all header fields", "Client, Store and Warehouse are required");
      return;
    }
    setFormSaving(true);
    try {
      if (editingOrderId) {
        await api.put(`/api/orders/${editingOrderId}`, buildOrderPayload());
        showToast("success", "Order updated");
      } else {
        await api.post("/api/orders", buildOrderPayload());
        showToast("success", "Draft order created");
      }
      setMode("list");
    } catch {
      showToast("error", "Failed to save order");
    } finally {
      setFormSaving(false);
    }
  };

  const handleConfirmForm = async () => {
    if (!clientId || !storeId || !warehouseId) {
      showToast("warning", "Please fill all header fields");
      return;
    }
    if (articleEntries.length === 0) {
      showToast("warning", "Add at least one article");
      return;
    }
    setFormSaving(true);
    try {
      let orderId = editingOrderId;
      if (!orderId) {
        const res = await api.post<ApiResponse<{ orderId: string }>>("/api/orders", buildOrderPayload());
        if (res.data.success && res.data.data) {
          orderId = res.data.data.orderId;
        }
      } else {
        await api.put(`/api/orders/${orderId}`, buildOrderPayload());
      }
      if (orderId) {
        await api.put(`/api/orders/${orderId}/confirm`);
        showToast("success", "Order confirmed");
      }
      setMode("list");
    } catch {
      showToast("error", "Failed to confirm order");
    } finally {
      setFormSaving(false);
    }
  };

  /* ================================================================
     List: columns
     ================================================================ */

  const columns: Column<Order>[] = [
    {
      key: "orderNo",
      header: "Order No",
      render: (o) => (
        <span className="font-mono text-xs font-semibold text-primary">{o.orderNo}</span>
      ),
    },
    {
      key: "orderDate",
      header: "Date",
      render: (o) => <span className="text-xs">{formatDate(o.orderDate)}</span>,
    },
    {
      key: "clientName",
      header: "Client",
      render: (o) => <span className="text-sm font-medium">{o.clientName}</span>,
    },
    {
      key: "storeName",
      header: "Store",
      render: (o) => <span className="text-xs text-muted-foreground">{o.storeName}</span>,
    },
    {
      key: "warehouseName",
      header: "Warehouse",
      render: (o) => <span className="text-xs text-muted-foreground">{o.warehouseName}</span>,
    },
    {
      key: "totalLines",
      header: "Articles",
      render: (o) => <span className="text-xs text-center block">{o.totalLines}</span>,
    },
    {
      key: "totalQuantity",
      header: "Total Qty",
      render: (o) => <span className="text-xs font-semibold text-center block">{o.totalQuantity}</span>,
    },
    {
      key: "totalAmount",
      header: "Amount",
      render: (o) => (
        <span className="text-xs font-semibold text-primary">{formatCurrency(o.totalAmount)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (o) => (
        <div className="flex items-center gap-0.5">
          {/* View — all statuses */}
          <button
            onClick={() => handleViewOrder(o)}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="View"
          >
            <Eye size={14} className="text-muted-foreground" />
          </button>

          {/* Edit — DRAFT only */}
          {o.status === "DRAFT" && (
            <button
              onClick={() => handleEditOrder(o)}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title="Edit"
            >
              <Edit2 size={14} className="text-muted-foreground" />
            </button>
          )}

          {/* Confirm — DRAFT only */}
          {o.status === "DRAFT" && (
            <button
              onClick={() => handleConfirmOrder(o)}
              className="p-1.5 rounded hover:bg-green-100 transition-colors"
              title="Confirm"
            >
              <Check size={14} className="text-green-600" />
            </button>
          )}

          {/* Delete — DRAFT only */}
          {o.status === "DRAFT" && (
            <button
              onClick={() => handleDeleteOrder(o)}
              className="p-1.5 rounded hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 size={14} className="text-destructive" />
            </button>
          )}

          {/* Dispatch — CONFIRMED only */}
          {o.status === "CONFIRMED" && (
            <button
              onClick={() => handleDispatchOrder(o)}
              className="p-1.5 rounded hover:bg-purple-50 transition-colors"
              title="Dispatch"
            >
              <Truck size={14} className="text-purple-600" />
            </button>
          )}

          {/* Generate Invoice — CONFIRMED or DISPATCHED */}
          {(o.status === "CONFIRMED" || o.status === "DISPATCHED") && (
            <button
              onClick={() => handleOpenInvoiceModal(o)}
              className="p-1.5 rounded hover:bg-blue-50 transition-colors"
              title="Generate Invoice"
            >
              <FileText size={14} className="text-blue-600" />
            </button>
          )}

          {/* Cancel — CONFIRMED only */}
          {o.status === "CONFIRMED" && (
            <button
              onClick={() => handleCancelOrder(o)}
              className="p-1.5 rounded hover:bg-red-50 transition-colors"
              title="Cancel"
            >
              <X size={14} className="text-red-500" />
            </button>
          )}
        </div>
      ),
    },
  ];

  /* ================================================================
     Form: derived
     ================================================================ */

  const grandTotalPairs = articleEntries.reduce(
    (sum, e) => sum + e.sizeData.reduce((s, sd) => s + sd.allocation, 0),
    0
  );
  const grandTotalAmount = articleEntries.reduce(
    (sum, e) =>
      sum + e.sizeData.reduce((s, sd) => s + sd.allocation, 0) * e.mrp,
    0
  );
  const excludedArticleIds = articleEntries.map((e) => e.articleId);

  /* ================================================================
     Render
     ================================================================ */

  /* ---- LIST MODE ---- */
  if (mode === "list") {
    return (
      <>
        <div className="space-y-4">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1 border-b overflow-x-auto pb-0">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setStatusFilter(tab);
                  setPageNumber(1);
                }}
                className={[
                  "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                  statusFilter === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40",
                ].join(" ")}
              >
                {tab === "All" ? "All Orders" : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <DataTable
            title="Manual Orders"
            subtitle="Customer order entry and management"
            columns={columns}
            data={orders}
            totalCount={totalCount}
            pageNumber={pageNumber}
            pageSize={PAGE_SIZE}
            onPageChange={setPageNumber}
            onSearch={(term) => { setSearch(term); setPageNumber(1); }}
            onAdd={handleNewOrder}
            onRefresh={fetchOrders}
            addLabel="New Order"
            loading={listLoading}
            keyExtractor={(o) => o.orderId}
            mobileColumns={["orderNo", "clientName", "totalAmount", "status"]}
          />
        </div>

        {/* View Detail Modal */}
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={viewOrder ? `Order ${viewOrder.orderNo}` : "Loading Order..."}
          subtitle={viewOrder ? `${viewOrder.clientName} — ${viewOrder.storeName}` : undefined}
          size="xl"
        >
          {viewLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              <span>Loading order details...</span>
            </div>
          ) : viewOrder ? (
            <OrderDetailContent order={viewOrder} />
          ) : null}
        </Modal>

        {/* Invoice Generation Modal */}
        <Modal
          isOpen={invoiceModalOpen}
          onClose={() => { setInvoiceModalOpen(false); setInvoiceOrder(null); }}
          title="Generate Invoice"
          subtitle={invoiceOrder ? `Order ${invoiceOrder.orderNo} — ${invoiceOrder.clientName}` : undefined}
          size="lg"
        >
          {invoiceOrder && (
            <InvoiceFormContent
              order={invoiceOrder}
              onSubmit={handleGenerateInvoice}
              onClose={() => { setInvoiceModalOpen(false); setInvoiceOrder(null); }}
            />
          )}
        </Modal>
      </>
    );
  }

  /* ---- FORM MODE ---- */
  return (
    <div className="space-y-5">
      {/* Form header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMode("list")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors font-medium"
          >
            <ArrowLeft size={14} />
            Back to List
          </button>
          <div>
            <h1 className="text-lg font-semibold">
              {editingOrderId ? "Edit Order" : "New Manual Order"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {editingOrderId ? `Editing order` : "Create a new customer order"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={formSaving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors font-medium disabled:opacity-60"
          >
            <Save size={14} />
            Save as Draft
          </button>
          <button
            type="button"
            onClick={handleConfirmForm}
            disabled={formSaving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-60"
          >
            {formSaving ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
            ) : (
              <CheckCircle size={14} />
            )}
            Confirm Order
          </button>
        </div>
      </div>

      {masterLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          <span>Loading master data...</span>
        </div>
      ) : (
        <>
          {/* Order Header Fields */}
          <div className="border rounded-xl p-5 bg-card space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Order Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.clientId} value={c.clientId}>
                      {c.clientName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Store */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Store <span className="text-red-500">*</span>
                </label>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  disabled={!clientId}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!clientId ? "Select a client first" : "Select store..."}
                  </option>
                  {stores.map((s) => (
                    <option key={s.storeId} value={s.storeId}>
                      {s.storeName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Warehouse */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Warehouse <span className="text-red-500">*</span>
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select warehouse...</option>
                  {warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.warehouseName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Notes
              </label>
              <textarea
                rows={2}
                placeholder="Order notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>
          </div>

          {/* Article Entries */}
          <div className="space-y-4">
            {articleEntries.length === 0 ? (
              <div className="border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No articles added yet</p>
                <p className="text-xs mt-1">Use the selector below to add articles to this order</p>
              </div>
            ) : (
              articleEntries.map((entry) => (
                <OrderArticleCard
                  key={entry.localId}
                  entry={entry}
                  onAllocationChange={handleAllocationChange}
                  onRemove={handleRemoveArticle}
                />
              ))
            )}

            {/* Article Selector */}
            <ArticleSelector
              articles={articles}
              onSelect={handleAddArticle}
              excludeIds={excludedArticleIds}
            />
          </div>

          {/* Grand Total Footer */}
          {articleEntries.length > 0 && (
            <div className="border rounded-xl p-5 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Order Summary
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {articleEntries.length} {articleEntries.length === 1 ? "article" : "articles"}
                  </p>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                      Total Pairs
                    </p>
                    <p className="text-2xl font-bold text-foreground">{grandTotalPairs}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                      Grand Total
                    </p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(grandTotalAmount)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
