"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  ScanLine,
  Package,
  AlertTriangle,
  Check,
  Plus,
  Minus,
  Trash2,
  Volume2,
  VolumeX,
  Save,
  X,
  Hash,
  ChevronDown,
  FileText,
  Truck,
  Eye,
  Edit2,
  List,
} from "lucide-react";

/* ================================================================
   Types
   ================================================================ */

interface Warehouse { warehouseId: string; warehouseName: string; }
interface Client { clientId: string; clientName: string; }
interface StoreInfo { storeId: string; storeCode: string; storeName: string; }
interface Article {
  articleId: string; articleCode: string; articleName: string;
  brandName: string; color: string; mrp: number; hsnCode?: string;
}

interface ScannedLine {
  id: string; barcode: string; articleId: string; articleCode: string;
  articleName: string; color: string; size: string; mrp: number; qty: number;
  hsnCode?: string;
}

interface SizeSummaryRow {
  articleCode: string; articleName: string;
  sizes: Record<string, number>; total: number;
}

interface Order {
  orderId: string; orderNo: string; orderDate: string;
  clientId: string; clientName: string;
  storeId: string; storeName: string;
  warehouseId: string; warehouseName?: string;
  totalLines: number; totalQuantity: number; totalAmount: number;
  status: "Draft" | "Confirmed" | "Cancelled" | "Dispatched";
  notes?: string;
}

/* ================================================================
   Constants
   ================================================================ */

const SIZE_COLUMNS = ["39", "40", "41", "42", "43", "44", "45", "46"];
const BARCODE_PATTERN = /^([A-Z0-9]+-?[A-Z0-9]+)-(\d{2,})$/i;
const STATUS_OPTIONS = ["All", "Draft", "Confirmed", "Cancelled", "Dispatched"];

/* ================================================================
   Helpers
   ================================================================ */

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `ORD-${y}${m}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

function parseBarcode(barcode: string): { code: string; size: string } | null {
  const trimmed = barcode.trim().toUpperCase();
  const match = trimmed.match(BARCODE_PATTERN);
  if (match) return { code: match[1], size: match[2] };
  const lastDash = trimmed.lastIndexOf("-");
  if (lastDash > 0) {
    const codePart = trimmed.slice(0, lastDash);
    const sizePart = trimmed.slice(lastDash + 1);
    if (/^\d+$/.test(sizePart)) return { code: codePart, size: sizePart };
  }
  return null;
}

/* ================================================================
   Flash notification
   ================================================================ */

function ScanFlash({ type, message, onDone }: { type: "success" | "error"; message: string; onDone: () => void; }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl animate-slideInRight ${type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
      {type === "success" ? <Check size={20} /> : <AlertTriangle size={20} />}
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
}

/* ================================================================
   Main Page Component
   ================================================================ */

export default function BarcodeScanEntryPage() {
  const [mode, setMode] = useState<"list" | "scan">("list");

  /* ---- List state ---- */
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [listLoading, setListLoading] = useState(false);

  /* ---- Reference data ---- */
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);

  /* ---- Order header (scan mode) ---- */
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderNo] = useState(() => generateOrderNumber());
  const [clientId, setClientId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split("T")[0]);

  /* ---- Scan state ---- */
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedLines, setScannedLines] = useState<ScannedLine[]>([]);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  /* ---- Scan UI state ---- */
  const [saving, setSaving] = useState(false);
  const [confirmSaving, setConfirmSaving] = useState(false);

  /* ---- View modal state ---- */
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  /* ---- Invoice modal state ---- */
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<any>(null);
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

  /* ---- Refs ---- */
  const barcodeRef = useRef<HTMLInputElement>(null);
  const successAudioRef = useRef<HTMLAudioElement | null>(null);
  const errorAudioRef = useRef<HTMLAudioElement | null>(null);

  const { showToast } = useToast();
  const { confirm: confirmDialog } = useConfirm();

  const inputCls = "w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card";

  /* ---- Init audio ---- */
  useEffect(() => {
    if (typeof window !== "undefined") {
      successAudioRef.current = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
      errorAudioRef.current = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
    }
  }, []);

  /* ---- Fetch orders list ---- */
  const fetchOrders = useCallback(async () => {
    setListLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/orders", {
        params: { search: search || undefined, status: statusFilter !== "All" ? statusFilter : undefined, page, pageSize: 25 },
      });
      if (data.success) {
        setOrders(data.data?.items || data.data || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch { setOrders([]); }
    finally { setListLoading(false); }
  }, [page, search, statusFilter]);

  /* ---- Fetch reference data ---- */
  const fetchReferenceData = useCallback(async () => {
    try {
      const [whRes, clientRes] = await Promise.all([
        api.get<ApiResponse<any>>("/api/warehouses", { params: { pageSize: 200 } }),
        api.get<ApiResponse<any>>("/api/clients", { params: { pageSize: 200 } }),
      ]);
      if (whRes.data.success) setWarehouses(whRes.data.data?.items || []);
      if (clientRes.data.success) setClients(clientRes.data.data?.items || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { fetchReferenceData(); }, [fetchReferenceData]);

  /* ---- Fetch stores when client changes ---- */
  useEffect(() => {
    if (!clientId) { setStores([]); setStoreId(""); return; }
    api.get<ApiResponse<any>>(`/api/clients/${clientId}/stores`, { params: { pageSize: 200 } })
      .then((res) => { if (res.data.success) setStores(res.data.data?.items || res.data.data || []); })
      .catch(() => setStores([]));
    setStoreId("");
  }, [clientId]);

  /* ---- Auto-focus barcode input when in scan mode ---- */
  useEffect(() => {
    if (mode === "scan") setTimeout(() => barcodeRef.current?.focus(), 100);
  }, [mode]);

  /* ---- Sound & flash ---- */
  const playSound = useCallback((type: "success" | "error") => {
    if (!soundEnabled) return;
    try {
      const audio = type === "success" ? successAudioRef.current : errorAudioRef.current;
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
    } catch { /* silent */ }
  }, [soundEnabled]);

  const showFlash = useCallback((type: "success" | "error", message: string) => {
    setFlash({ type, message }); playSound(type);
  }, [playSound]);

  /* ---- Handle barcode scan ---- */
  const handleBarcodeScan = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setBarcodeInput(""); return; }
    if (e.key !== "Enter" || !barcodeInput.trim()) return;

    const rawBarcode = barcodeInput.trim();
    const parsed = parseBarcode(rawBarcode);
    if (!parsed) {
      showFlash("error", `Invalid barcode format: ${rawBarcode}`);
      setBarcodeInput(""); barcodeRef.current?.focus(); return;
    }

    const existingIndex = scannedLines.findIndex(
      (l) => l.articleCode.toUpperCase() === parsed.code.toUpperCase() && l.size === parsed.size
    );
    if (existingIndex >= 0) {
      setScannedLines((prev) => {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], qty: updated[existingIndex].qty + 1 };
        return updated;
      });
      setLastScannedId(scannedLines[existingIndex].id);
      showFlash("success", `+1 ${parsed.code} Size ${parsed.size} (Qty: ${scannedLines[existingIndex].qty + 1})`);
      setBarcodeInput(""); barcodeRef.current?.focus(); return;
    }

    try {
      const res = await api.get<ApiResponse<any>>("/api/articles", { params: { searchTerm: parsed.code, pageSize: 10 } });
      let article: Article | null = null;
      if (res.data.success) {
        const items = res.data.data?.items || [];
        article = items.find((a: any) =>
          a.articleCode?.toUpperCase() === parsed.code.toUpperCase() ||
          a.articleCode?.replace(/-/g, "").toUpperCase() === parsed.code.replace(/-/g, "").toUpperCase()
        );
      }
      if (!article) {
        article = { articleId: `scan-${Date.now()}`, articleCode: parsed.code, articleName: parsed.code, brandName: "", color: "", mrp: 0 };
      }
      const newLine: ScannedLine = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        barcode: rawBarcode, articleId: article.articleId, articleCode: article.articleCode,
        articleName: article.articleName, color: article.color || "", size: parsed.size,
        mrp: article.mrp || 0, qty: 1, hsnCode: article.hsnCode || "",
      };
      setScannedLines((prev) => [...prev, newLine]);
      setLastScannedId(newLine.id);
      showFlash("success", `Added ${article.articleCode} Size ${parsed.size}`);
    } catch {
      showFlash("error", `Failed to look up article: ${parsed.code}`);
    }
    setBarcodeInput(""); barcodeRef.current?.focus();
  }, [barcodeInput, scannedLines, showFlash]);

  const adjustQty = useCallback((lineId: string, delta: number) => {
    setScannedLines((prev) => prev.map((l) => l.id !== lineId ? l : { ...l, qty: Math.max(1, l.qty + delta) }));
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setScannedLines((prev) => prev.filter((l) => l.id !== lineId));
  }, []);

  /* ---- Computed ---- */
  const groupedLines = useMemo(() => {
    const groups: Record<string, { articleCode: string; articleName: string; hsnCode: string; mrp: number; lines: ScannedLine[] }> = {};
    scannedLines.forEach((line) => {
      if (!groups[line.articleCode]) groups[line.articleCode] = { articleCode: line.articleCode, articleName: line.articleName, hsnCode: line.hsnCode || "", mrp: line.mrp, lines: [] };
      groups[line.articleCode].lines.push(line);
    });
    return Object.values(groups);
  }, [scannedLines]);

  const sizeSummary: SizeSummaryRow[] = useMemo(() => {
    const map: Record<string, SizeSummaryRow> = {};
    scannedLines.forEach((line) => {
      if (!map[line.articleCode]) map[line.articleCode] = { articleCode: line.articleCode, articleName: line.articleName, sizes: {}, total: 0 };
      const row = map[line.articleCode];
      row.sizes[line.size] = (row.sizes[line.size] || 0) + line.qty;
      row.total += line.qty;
    });
    return Object.values(map);
  }, [scannedLines]);

  const totalPairs = useMemo(() => scannedLines.reduce((s, l) => s + l.qty, 0), [scannedLines]);
  const totalValue = useMemo(() => scannedLines.reduce((s, l) => s + l.mrp * l.qty, 0), [scannedLines]);

  /* ---- Build order payload (matching backend CreateSizeWiseOrderRequest) ---- */
  const buildOrderPayload = useCallback(() => {
    const articleMap: Record<string, { articleId: string; articleCode: string; articleName: string; color: string; hsnCode: string; mrp: number; sizeQuantities: { euroSize: number; quantity: number }[] }> = {};
    scannedLines.forEach((line) => {
      if (!articleMap[line.articleCode]) {
        articleMap[line.articleCode] = {
          articleId: line.articleId, articleCode: line.articleCode, articleName: line.articleName,
          color: line.color, hsnCode: line.hsnCode || "", mrp: line.mrp, sizeQuantities: [],
        };
      }
      const euroSize = parseInt(line.size);
      if (!isNaN(euroSize)) {
        const existing = articleMap[line.articleCode].sizeQuantities.find((s) => s.euroSize === euroSize);
        if (existing) existing.quantity += line.qty;
        else articleMap[line.articleCode].sizeQuantities.push({ euroSize, quantity: line.qty });
      }
    });
    return { clientId, storeId, warehouseId, orderDate, articles: Object.values(articleMap) };
  }, [clientId, storeId, warehouseId, orderDate, scannedLines]);

  /* ---- Save as Draft ---- */
  const handleSaveDraft = async () => {
    if (!clientId) { showFlash("error", "Please select a Client."); return; }
    if (scannedLines.length === 0) { showFlash("error", "No items scanned."); return; }
    setSaving(true);
    try {
      if (editingOrderId) {
        await api.put(`/api/orders/${editingOrderId}`, buildOrderPayload());
      } else {
        await api.post("/api/orders", buildOrderPayload());
      }
      showFlash("success", "Order saved as draft.");
      resetScanForm(); setMode("list"); fetchOrders();
    } catch (err: any) {
      showFlash("error", err.response?.data?.message || "Failed to save draft.");
    } finally { setSaving(false); }
  };

  /* ---- Confirm Order ---- */
  const handleConfirmOrder = async () => {
    if (!clientId) { showFlash("error", "Please select a Client."); return; }
    if (scannedLines.length === 0) { showFlash("error", "No items scanned."); return; }
    setConfirmSaving(true);
    try {
      let orderId = editingOrderId;
      if (!orderId) {
        const { data } = await api.post<ApiResponse<any>>("/api/orders", buildOrderPayload());
        if (data.success && data.data) orderId = data.data.orderId || data.data.id;
        else throw new Error(data.message || "Failed to create order");
      } else {
        await api.put(`/api/orders/${orderId}`, buildOrderPayload());
      }
      await api.put(`/api/orders/${orderId}/confirm`);
      showFlash("success", "Order confirmed!");
      resetScanForm(); setMode("list"); fetchOrders();
    } catch (err: any) {
      showFlash("error", err.response?.data?.message || "Failed to confirm order.");
    } finally { setConfirmSaving(false); }
  };

  const resetScanForm = useCallback(() => {
    setScannedLines([]); setClientId(""); setStoreId(""); setWarehouseId("");
    setOrderDate(new Date().toISOString().split("T")[0]); setEditingOrderId(null);
  }, []);

  /* ---- List actions ---- */
  const handleViewOrder = async (order: Order) => {
    try {
      const { data } = await api.get<ApiResponse<any>>(`/api/orders/${order.orderId}`);
      setViewOrder(data.success ? data.data : order);
    } catch { setViewOrder(order); }
    setViewModalOpen(true);
  };

  const handleEditDraft = async (order: Order) => {
    try {
      const { data } = await api.get<ApiResponse<any>>(`/api/orders/${order.orderId}`);
      if (data.success && data.data) {
        const detail = data.data;
        setClientId(detail.clientId || "");
        setStoreId(detail.storeId || "");
        setWarehouseId(detail.warehouseId || "");
        setOrderDate(detail.orderDate ? new Date(detail.orderDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
        setEditingOrderId(order.orderId);
        // Rebuild scanned lines from order articles
        const lines: ScannedLine[] = [];
        const articles = detail.articles || detail.lines || [];
        articles.forEach((a: any) => {
          const sizes = a.sizeQuantities || a.sizes || a.sizeRuns || [];
          sizes.forEach((s: any) => {
            const qty = s.quantity || s.qty || s.orderQty || 0;
            const euroSize = String(s.euroSize || s.size || "");
            if (qty > 0 && euroSize) {
              lines.push({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                barcode: `${a.articleCode || ""}-${euroSize}`,
                articleId: a.articleId, articleCode: a.articleCode || "", articleName: a.articleName || "",
                color: a.color || a.colour || "", size: euroSize, mrp: a.mrp || 0, qty,
                hsnCode: a.hsnCode || "",
              });
            }
          });
        });
        setScannedLines(lines);
      }
    } catch { /* use empty */ }
    setMode("scan");
  };

  const handleDeleteOrder = async (order: Order) => {
    if (order.status !== "Draft") { showToast("error", "Cannot Delete", "Only Draft orders can be deleted."); return; }
    const ok = await confirmDialog({ title: "Delete Order", message: `Delete order "${order.orderNo}"? This cannot be undone.`, confirmLabel: "Delete", variant: "danger" });
    if (!ok) return;
    try {
      await api.delete(`/api/orders/${order.orderId}`);
      showToast("success", "Deleted", `"${order.orderNo}" removed.`);
      fetchOrders();
    } catch (err: any) { showToast("error", "Failed", err.response?.data?.message || "Error."); }
  };

  const handleConfirmFromList = async (order: Order) => {
    const ok = await confirmDialog({ title: "Confirm Order", message: `Confirm "${order.orderNo}"? Stock will be deducted.`, confirmLabel: "Confirm", variant: "danger" });
    if (!ok) return;
    try {
      await api.put(`/api/orders/${order.orderId}/confirm`);
      showToast("success", "Confirmed", `"${order.orderNo}" confirmed.`);
      fetchOrders();
    } catch (err: any) { showToast("error", "Failed", err.response?.data?.message || "Error."); }
  };

  const handleCancelFromList = async (order: Order) => {
    const ok = await confirmDialog({ title: "Cancel Order", message: `Cancel "${order.orderNo}"? This cannot be undone.`, confirmLabel: "Cancel Order", variant: "danger" });
    if (!ok) return;
    try {
      await api.put(`/api/orders/${order.orderId}/cancel`);
      showToast("success", "Cancelled", `"${order.orderNo}" cancelled.`);
      fetchOrders();
    } catch (err: any) { showToast("error", "Failed", err.response?.data?.message || "Error."); }
  };

  const handleDispatchFromList = async (order: Order) => {
    const ok = await confirmDialog({ title: "Dispatch Order", message: `Dispatch "${order.orderNo}"?`, confirmLabel: "Dispatch", variant: "danger" });
    if (!ok) return;
    try {
      await api.put(`/api/orders/${order.orderId}/dispatch`);
      showToast("success", "Dispatched", `"${order.orderNo}" dispatched.`);
      fetchOrders();
    } catch (err: any) { showToast("error", "Failed", err.response?.data?.message || "Error."); }
  };

  /* ---- Invoice modal ---- */
  const openInvoiceModal = async (order: Order) => {
    setInvoiceOrder(order); setInvDate(new Date().toISOString().split("T")[0]);
    setInvMarginPct("0"); setInvPoNumber(""); setInvPoDate(""); setInvIsInterState(false);
    setInvCartonBoxes("1"); setInvLogistic(""); setInvTransportMode("Road"); setInvVehicleNo(""); setInvNotes("");
    setInvoiceDetail(null);
    try {
      const { data } = await api.get<ApiResponse<any>>(`/api/orders/${order.orderId}`);
      if (data.success) setInvoiceDetail(data.data);
    } catch { /* silent */ }
    setInvoiceModalOpen(true);
  };

  const handleCreateInvoice = async () => {
    if (!invoiceOrder) return;
    setInvCreating(true);
    try {
      const detail = invoiceDetail;
      const marginPct = parseFloat(invMarginPct) || 0;
      const articles = detail?.articles || detail?.lines || [];
      const lines = articles.map((a: any) => {
        const sizeBreakdown: Record<string, number> = {};
        const sizes = a.sizeQuantities || a.sizes || a.sizeRuns || [];
        sizes.forEach((s: any) => {
          const euroSize = s.euroSize || s.size;
          const qty = s.quantity || s.qty || s.orderQty || 0;
          if (euroSize && qty) sizeBreakdown[String(euroSize)] = qty;
        });
        return {
          articleId: a.articleId, sku: a.articleCode || "", articleName: a.articleName || "",
          description: a.articleName || "", hsnCode: a.hsnCode || "", color: a.color || a.colour || "",
          mrp: a.mrp || 0, quantity: a.quantity || a.totalQuantity || 0,
          marginPercent: marginPct, sizeBreakdownJson: JSON.stringify(sizeBreakdown), uom: "Pairs",
        };
      });
      await api.post("/api/invoices", {
        orderId: invoiceOrder.orderId, orderNumber: invoiceOrder.orderNo,
        clientId: invoiceOrder.clientId, storeId: invoiceOrder.storeId,
        invoiceDate: invDate, isInterState: invIsInterState,
        poNumber: invPoNumber || undefined, poDate: invPoDate || undefined,
        cartonBoxes: parseInt(invCartonBoxes) || 1,
        logistic: invLogistic || undefined, transportMode: invTransportMode || undefined,
        vehicleNo: invVehicleNo || undefined, notes: invNotes || undefined, lines,
      });
      showToast("success", "Invoice Created", `Invoice for ${invoiceOrder.orderNo} created.`);
      setInvoiceModalOpen(false); fetchOrders();
    } catch (err: any) {
      showToast("error", "Failed", err.response?.data?.message || "Error creating invoice.");
    } finally { setInvCreating(false); }
  };

  /* ================================================================
     TABLE COLUMNS
     ================================================================ */

  const columns: Column<Order>[] = [
    { key: "orderNo", header: "Order No", className: "font-mono text-xs font-medium whitespace-nowrap" },
    { key: "orderDate", header: "Date", render: (o) => formatDate(o.orderDate) },
    { key: "clientName", header: "Client" },
    { key: "storeName", header: "Store" },
    { key: "totalQuantity", header: "Pairs", className: "text-center font-medium" },
    {
      key: "totalAmount", header: "Amount",
      render: (o) => formatCurrency(o.totalAmount), className: "text-right font-medium",
    },
    {
      key: "status", header: "Status",
      render: (o) => <StatusBadge status={o.status.toUpperCase()} />,
    },
    {
      key: "actions", header: "Actions",
      render: (o) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); handleViewOrder(o); }} className="p-1.5 rounded hover:bg-muted" title="View">
            <Eye size={14} className="text-muted-foreground" />
          </button>
          {o.status === "Draft" && (
            <>
              <button onClick={(e) => { e.stopPropagation(); handleEditDraft(o); }} className="p-1.5 rounded hover:bg-muted" title="Edit & Scan More">
                <Edit2 size={14} className="text-primary" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleConfirmFromList(o); }} className="p-1.5 rounded hover:bg-green-50" title="Confirm">
                <Check size={14} className="text-green-600" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteOrder(o); }} className="p-1.5 rounded hover:bg-destructive/10" title="Delete">
                <Trash2 size={14} className="text-destructive" />
              </button>
            </>
          )}
          {o.status === "Confirmed" && (
            <>
              <button onClick={(e) => { e.stopPropagation(); handleDispatchFromList(o); }} className="p-1.5 rounded hover:bg-blue-50" title="Dispatch">
                <Truck size={14} className="text-blue-600" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); openInvoiceModal(o); }} className="p-1.5 rounded hover:bg-emerald-50" title="Generate Invoice">
                <FileText size={14} className="text-emerald-600" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleCancelFromList(o); }} className="p-1.5 rounded hover:bg-red-50" title="Cancel">
                <X size={14} className="text-red-600" />
              </button>
            </>
          )}
          {o.status === "Dispatched" && (
            <button onClick={(e) => { e.stopPropagation(); openInvoiceModal(o); }} className="p-1.5 rounded hover:bg-emerald-50" title="Generate Invoice">
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

  if (mode === "list") {
    return (
      <>
        {/* Status filter tabs */}
        <div className="flex items-center gap-2 mb-4">
          {STATUS_OPTIONS.map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}>
              {s}
            </button>
          ))}
        </div>

        <DataTable
          title="Barcode Scan Orders"
          subtitle="Orders created via barcode scanning"
          columns={columns}
          data={orders}
          totalCount={totalCount}
          pageNumber={page}
          pageSize={25}
          onPageChange={setPage}
          onSearch={setSearch}
          onAdd={() => { resetScanForm(); setMode("scan"); }}
          onEdit={(o) => { if (o.status === "Draft") handleEditDraft(o); else handleViewOrder(o); }}
          onDelete={handleDeleteOrder}
          addLabel="New Scan"
          loading={listLoading}
          keyExtractor={(o) => o.orderId}
        />

        {/* View Order Modal */}
        <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Order Details" size="lg">
          {viewOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Order No:</span> <strong>{viewOrder.orderNo}</strong></div>
                <div><span className="text-muted-foreground">Date:</span> {formatDate(viewOrder.orderDate)}</div>
                <div><span className="text-muted-foreground">Client:</span> {viewOrder.clientName}</div>
                <div><span className="text-muted-foreground">Store:</span> {viewOrder.storeName}</div>
                <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={(viewOrder.status || "").toUpperCase()} /></div>
                <div><span className="text-muted-foreground">Total Qty:</span> <strong>{viewOrder.totalQuantity}</strong></div>
              </div>
              {(viewOrder.articles || viewOrder.lines || []).length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left">Article</th>
                        <th className="px-3 py-2 text-center">Sizes</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewOrder.articles || viewOrder.lines || []).map((a: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 font-medium">{a.articleCode || a.sku} — {a.articleName}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground">
                            {(a.sizeQuantities || a.sizes || []).map((s: any) => `${s.euroSize || s.size}×${s.quantity || s.qty}`).join(", ")}
                          </td>
                          <td className="px-3 py-2 text-right">{a.quantity || a.totalQuantity || 0}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency((a.quantity || a.totalQuantity || 0) * (a.mrp || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={() => setViewModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Close</button>
              </div>
            </div>
          )}
        </Modal>

        {/* Invoice Modal */}
        <Modal isOpen={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title="Generate Invoice" size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
              <FileText size={16} />
              <span>Invoice for order <strong>{invoiceOrder?.orderNo}</strong> — {invoiceOrder?.clientName}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Invoice Date *</label>
                <input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} className={inputCls} /></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Margin %</label>
                <input type="number" min="0" max="100" step="0.01" value={invMarginPct} onChange={(e) => setInvMarginPct(e.target.value)} className={inputCls} /></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">PO Number</label>
                <input type="text" value={invPoNumber} onChange={(e) => setInvPoNumber(e.target.value)} placeholder="Purchase Order No" className={inputCls} /></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">PO Date</label>
                <input type="date" value={invPoDate} onChange={(e) => setInvPoDate(e.target.value)} className={inputCls} /></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Carton Boxes</label>
                <input type="number" min="1" value={invCartonBoxes} onChange={(e) => setInvCartonBoxes(e.target.value)} className={inputCls} /></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Transport Mode</label>
                <select value={invTransportMode} onChange={(e) => setInvTransportMode(e.target.value)} className={inputCls}>
                  <option>Road</option><option>Rail</option><option>Air</option><option>Ship</option><option>Courier</option>
                </select></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Logistic Partner</label>
                <input type="text" value={invLogistic} onChange={(e) => setInvLogistic(e.target.value)} placeholder="Courier / Transporter" className={inputCls} /></div>
              <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Vehicle / LR No</label>
                <input type="text" value={invVehicleNo} onChange={(e) => setInvVehicleNo(e.target.value)} className={inputCls} /></div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <input type="checkbox" id="invInterState2" checked={invIsInterState} onChange={(e) => setInvIsInterState(e.target.checked)} className="w-4 h-4 accent-primary" />
              <label htmlFor="invInterState2" className="text-sm font-medium cursor-pointer">Inter-State Supply (IGST)</label>
            </div>
            <div><label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Notes</label>
              <input type="text" value={invNotes} onChange={(e) => setInvNotes(e.target.value)} placeholder="Additional notes..." className={inputCls} /></div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <button onClick={() => setInvoiceModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleCreateInvoice} disabled={invCreating || !invDate}
                className="flex items-center gap-1.5 px-6 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold disabled:opacity-50">
                <FileText size={14} />{invCreating ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  /* ============================================================
     SCAN MODE
     ============================================================ */

  const labelCls = "block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider";

  return (
    <div className="space-y-5">
      {flash && <ScanFlash type={flash.type} message={flash.message} onDone={() => setFlash(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ScanLine size={22} className="text-primary" />
            Barcode Scan Entry
            {editingOrderId && <span className="text-sm font-normal text-muted-foreground ml-2">— Editing draft</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Scan barcodes to create orders instantly</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${soundEnabled ? "bg-primary/10 border-primary/30 text-primary" : "hover:bg-muted"}`}>
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            Sound {soundEnabled ? "On" : "Off"}
          </button>
          <button onClick={() => { resetScanForm(); setMode("list"); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted">
            <List size={16} /> Back to List
          </button>
          <button onClick={handleSaveDraft} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border rounded-lg hover:bg-muted font-medium disabled:opacity-50">
            <Save size={16} />{saving ? "Saving..." : "Save as Draft"}
          </button>
          <button onClick={handleConfirmOrder} disabled={confirmSaving}
            className="flex items-center gap-1.5 px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50">
            <Hash size={16} />{confirmSaving ? "Confirming..." : "Confirm Order"}
          </button>
        </div>
      </div>

      {/* Order Header Form */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/20 border rounded-xl">
        <div>
          <label className={labelCls}>ORDER NO</label>
          <input type="text" value={editingOrderId ? "Editing Draft" : orderNo} readOnly className={`${inputCls} bg-muted/40`} />
        </div>
        <div>
          <label className={labelCls}>CLIENT *</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
            <option value="">Select Client</option>
            {clients.map((c) => <option key={c.clientId} value={c.clientId}>{c.clientName}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>STORE</label>
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)} disabled={!clientId} className={inputCls}>
            <option value="">{clientId ? "Select Store" : "Select Client first"}</option>
            {stores.map((s) => <option key={s.storeId} value={s.storeId}>{s.storeCode} — {s.storeName}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>WAREHOUSE *</label>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputCls}>
            <option value="">Select Warehouse</option>
            {warehouses.map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseName}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>ORDER DATE</label>
          <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Barcode Input */}
      <div className="relative border-2 border-primary/30 rounded-xl p-4 bg-primary/5 focus-within:border-primary transition-colors">
        <div className="flex items-center gap-3">
          <ScanLine size={28} className="text-primary shrink-0" />
          <input
            ref={barcodeRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={handleBarcodeScan}
            placeholder="Scan or type barcode + Enter... (e.g., B26FW001-39)"
            className="flex-1 bg-transparent text-base focus:outline-none placeholder:text-muted-foreground/60"
            autoComplete="off"
          />
          {barcodeInput && (
            <button onClick={() => { setBarcodeInput(""); barcodeRef.current?.focus(); }} className="p-1 rounded hover:bg-muted">
              <X size={16} className="text-muted-foreground" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 ml-10">
          Press <kbd className="bg-card border px-1 rounded text-xs">Enter</kbd> to scan ·{" "}
          <kbd className="bg-card border px-1 rounded text-xs">Esc</kbd> to clear
        </p>
      </div>

      {/* Main content area: Scanned items + Size summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Scanned Items */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Package size={16} className="text-primary" />
              Scanned Items
            </h2>
            <span className="text-xs text-muted-foreground">{scannedLines.length} line{scannedLines.length !== 1 ? "s" : ""} · {totalPairs} pair{totalPairs !== 1 ? "s" : ""}</span>
          </div>

          {scannedLines.length === 0 ? (
            <div className="border-2 border-dashed rounded-xl p-10 text-center text-muted-foreground">
              <ScanLine size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No items scanned yet. Start scanning barcodes above.</p>
            </div>
          ) : (
            <>
              <div className="border rounded-xl overflow-hidden">
                <div className="grid grid-cols-[2rem_1fr_1fr_1fr_5rem_5rem_6rem_2rem] gap-0 bg-muted/50 text-xs font-semibold text-muted-foreground px-3 py-2 border-b">
                  <span>#</span><span>BARCODE</span><span>ARTICLE</span><span>COLOUR</span><span className="text-center">SIZE</span><span className="text-center">MRP</span><span className="text-center">QTY</span><span></span>
                </div>
                {groupedLines.map((group) => (
                  <div key={group.articleCode}>
                    <div className="px-3 py-1.5 bg-primary/5 text-xs font-bold text-primary flex items-center gap-2">
                      <span className="font-mono bg-primary/10 px-1.5 rounded">{group.articleCode}</span>
                      {group.articleName !== group.articleCode && <span className="font-normal text-foreground">{group.articleName}</span>}
                    </div>
                    {group.lines.map((line, idx) => (
                      <div key={line.id}
                        className={`grid grid-cols-[2rem_1fr_1fr_1fr_5rem_5rem_6rem_2rem] gap-0 items-center px-3 py-2 border-t text-sm ${line.id === lastScannedId ? "bg-emerald-50" : "hover:bg-muted/30"}`}>
                        <span className="text-xs text-muted-foreground">{idx + 1}</span>
                        <span className="font-mono text-xs truncate">{line.barcode}</span>
                        <span className="text-xs truncate">{line.articleName}</span>
                        <span className="text-xs text-muted-foreground">{line.color || "—"}</span>
                        <span className={`text-center font-bold text-xs px-2 py-0.5 rounded ${line.size ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                          {line.size || "—"}
                        </span>
                        <span className="text-center text-xs">{line.mrp > 0 ? formatCurrency(line.mrp) : "—"}</span>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => adjustQty(line.id, -1)} className="w-5 h-5 flex items-center justify-center rounded border hover:bg-muted text-xs">
                            <Minus size={10} />
                          </button>
                          <span className="w-6 text-center text-xs font-semibold">{line.qty}</span>
                          <button onClick={() => adjustQty(line.id, 1)} className="w-5 h-5 flex items-center justify-center rounded border hover:bg-muted text-xs">
                            <Plus size={10} />
                          </button>
                        </div>
                        <button onClick={() => removeLine(line.id)} className="p-1 rounded hover:bg-destructive/10">
                          <Trash2 size={12} className="text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Footer totals */}
              <div className="flex items-center justify-between p-3 bg-card border rounded-xl text-sm">
                <div className="flex gap-4">
                  <span>Total Items: <strong>{scannedLines.length}</strong></span>
                  <span>Total Pairs: <strong className="text-primary">{totalPairs}</strong></span>
                </div>
                <span>Total Value: <strong className="text-primary">{formatCurrency(totalValue)}</strong></span>
              </div>
            </>
          )}
        </div>

        {/* Size-wise Summary */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Hash size={16} className="text-primary" />
            Size-wise Summary
          </h2>
          {sizeSummary.length === 0 ? (
            <div className="border-2 border-dashed rounded-xl p-6 text-center text-muted-foreground text-sm">No items yet</div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 grid gap-1 text-xs font-semibold text-muted-foreground" style={{ gridTemplateColumns: `1fr repeat(${SIZE_COLUMNS.length}, 2rem) 3rem` }}>
                <span>ARTICLE</span>
                {SIZE_COLUMNS.map((s) => <span key={s} className="text-center">{s}</span>)}
                <span className="text-right">TOTAL</span>
              </div>
              {sizeSummary.map((row) => (
                <div key={row.articleCode} className="border-t px-3 py-2 grid gap-1 items-center text-xs" style={{ gridTemplateColumns: `1fr repeat(${SIZE_COLUMNS.length}, 2rem) 3rem` }}>
                  <span className="font-medium text-primary truncate">{row.articleCode}</span>
                  {SIZE_COLUMNS.map((s) => (
                    <span key={s} className={`text-center ${row.sizes[s] ? "font-bold text-primary bg-primary/10 rounded" : "text-muted-foreground"}`}>
                      {row.sizes[s] || 0}
                    </span>
                  ))}
                  <span className="text-right font-bold">{row.total}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bottom totals summary */}
          <div className="p-3 bg-card border rounded-xl space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Articles</span><strong>{groupedLines.length}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Pairs</span><strong className="text-primary">{totalPairs}</strong></div>
            <div className="flex justify-between border-t pt-1 mt-1"><span className="text-muted-foreground">Total Value</span><strong className="text-primary">{formatCurrency(totalValue)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
