"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  ScanLine,
  Package,
  AlertTriangle,
  Check,
  Plus,
  Minus,
  Trash2,
  Search,
  Volume2,
  VolumeX,
  ShoppingCart,
  Save,
  X,
  Hash,
  ChevronDown,
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

interface ScannedLine {
  id: string;
  barcode: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  color: string;
  size: string;
  mrp: number;
  qty: number;
  hsnCode?: string;
  imageUrl?: string;
}

interface SizeSummaryRow {
  articleCode: string;
  articleName: string;
  sizes: Record<string, number>;
  total: number;
}

/* ================================================================
   Constants
   ================================================================ */

const SIZE_COLUMNS = ["39", "40", "41", "42", "43", "44", "45", "46"];

const BARCODE_PATTERN = /^([A-Z0-9]+-?[A-Z0-9]+)-(\d{2,})$/i;

/* ================================================================
   Helpers
   ================================================================ */

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `ORD-${y}${m}-${seq}`;
}

function parseBarcode(barcode: string): { code: string; size: string } | null {
  const trimmed = barcode.trim().toUpperCase();
  const match = trimmed.match(BARCODE_PATTERN);
  if (match) {
    return { code: match[1], size: match[2] };
  }
  // Fallback: try splitting by last hyphen
  const lastDash = trimmed.lastIndexOf("-");
  if (lastDash > 0) {
    const codePart = trimmed.slice(0, lastDash);
    const sizePart = trimmed.slice(lastDash + 1);
    if (/^\d+$/.test(sizePart)) {
      return { code: codePart, size: sizePart };
    }
  }
  return null;
}

/* ================================================================
   Flash Animation Component
   ================================================================ */

function ScanFlash({
  type,
  message,
  onDone,
}: {
  type: "success" | "error";
  message: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={`
        fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl
        animate-slideInRight
        ${
          type === "success"
            ? "bg-emerald-500 text-white"
            : "bg-red-500 text-white"
        }
      `}
    >
      {type === "success" ? <Check size={20} /> : <AlertTriangle size={20} />}
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
}

/* ================================================================
   Main Page Component
   ================================================================ */

export default function BarcodeScanEntryPage() {
  /* ---- Reference data ---- */
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);

  /* ---- Order header ---- */
  const [orderNo] = useState(() => generateOrderNumber());
  const [clientId, setClientId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [orderDate, setOrderDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );

  /* ---- Scan state ---- */
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedLines, setScannedLines] = useState<ScannedLine[]>([]);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  /* ---- UI state ---- */
  const [saving, setSaving] = useState(false);
  const [confirmSaving, setConfirmSaving] = useState(false);

  /* ---- Refs ---- */
  const barcodeRef = useRef<HTMLInputElement>(null);
  const successAudioRef = useRef<HTMLAudioElement | null>(null);
  const errorAudioRef = useRef<HTMLAudioElement | null>(null);

  /* ---- Initialize audio ---- */
  useEffect(() => {
    if (typeof window !== "undefined") {
      successAudioRef.current = new Audio(
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
      );
      errorAudioRef.current = new Audio(
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
      );
    }
  }, []);

  /* ---- Fetch reference data ---- */
  const fetchReferenceData = useCallback(async () => {
    try {
      const [whRes, clientRes] = await Promise.all([
        api.get<ApiResponse<any>>("/api/warehouses", {
          params: { pageSize: 200 },
        }),
        api.get<ApiResponse<any>>("/api/clients", {
          params: { pageSize: 200 },
        }),
      ]);
      if (whRes.data.success)
        setWarehouses(whRes.data.data?.items || []);
      if (clientRes.data.success)
        setClients(clientRes.data.data?.items || []);
    } catch {
      // Silently fail — reference data will be empty
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

  /* ---- Auto-focus barcode input ---- */
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  /* ---- Play sound ---- */
  const playSound = useCallback(
    (type: "success" | "error") => {
      if (!soundEnabled) return;
      try {
        const audio = type === "success" ? successAudioRef.current : errorAudioRef.current;
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }
      } catch {
        // Audio play failed silently
      }
    },
    [soundEnabled]
  );

  /* ---- Show flash notification ---- */
  const showFlash = useCallback(
    (type: "success" | "error", message: string) => {
      setFlash({ type, message });
      playSound(type);
    },
    [playSound]
  );

  /* ---- Handle barcode scan ---- */
  const handleBarcodeScan = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setBarcodeInput("");
        return;
      }
      if (e.key !== "Enter" || !barcodeInput.trim()) return;

      const rawBarcode = barcodeInput.trim();
      const parsed = parseBarcode(rawBarcode);

      if (!parsed) {
        showFlash("error", `Invalid barcode format: ${rawBarcode}`);
        setBarcodeInput("");
        barcodeRef.current?.focus();
        return;
      }

      // Check if this exact barcode+size already exists
      const existingIndex = scannedLines.findIndex(
        (line) =>
          line.articleCode.toUpperCase() === parsed.code.toUpperCase() &&
          line.size === parsed.size
      );

      if (existingIndex >= 0) {
        // Increment quantity
        setScannedLines((prev) => {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            qty: updated[existingIndex].qty + 1,
          };
          return updated;
        });
        setLastScannedId(scannedLines[existingIndex].id);
        showFlash(
          "success",
          `+1 ${parsed.code} Size ${parsed.size} (Qty: ${scannedLines[existingIndex].qty + 1})`
        );
        setBarcodeInput("");
        barcodeRef.current?.focus();
        return;
      }

      // Try to look up article from API
      try {
        const res = await api.get<ApiResponse<any>>("/api/articles", {
          params: { searchTerm: parsed.code, pageSize: 10 },
        });

        let article: Article | null = null;

        if (res.data.success) {
          const items = res.data.data?.items || [];
          article = items.find(
            (a: any) =>
              a.articleCode?.toUpperCase() === parsed.code.toUpperCase() ||
              a.articleCode
                ?.replace(/-/g, "")
                .toUpperCase() === parsed.code.replace(/-/g, "").toUpperCase()
          );
        }

        if (!article) {
          // Create a placeholder article from the barcode
          article = {
            articleId: `scan-${Date.now()}`,
            articleCode: parsed.code,
            articleName: parsed.code,
            brandName: "",
            color: "",
            mrp: 0,
            hsnCode: "",
          };
        }

        const newLine: ScannedLine = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          barcode: rawBarcode,
          articleId: article.articleId,
          articleCode: article.articleCode,
          articleName: article.articleName,
          color: article.color || "",
          size: parsed.size,
          mrp: article.mrp || 0,
          qty: 1,
          hsnCode: article.hsnCode || "",
          imageUrl: article.imageUrl || "",
        };

        setScannedLines((prev) => [...prev, newLine]);
        setLastScannedId(newLine.id);
        showFlash("success", `Added ${article.articleCode} Size ${parsed.size}`);
      } catch {
        showFlash("error", `Failed to look up article: ${parsed.code}`);
      }

      setBarcodeInput("");
      barcodeRef.current?.focus();
    },
    [barcodeInput, scannedLines, showFlash]
  );

  /* ---- Quantity adjustment ---- */
  const adjustQty = useCallback(
    (lineId: string, delta: number) => {
      setScannedLines((prev) =>
        prev.map((line) => {
          if (line.id !== lineId) return line;
          const newQty = Math.max(1, line.qty + delta);
          return { ...line, qty: newQty };
        })
      );
    },
    []
  );

  /* ---- Remove line ---- */
  const removeLine = useCallback((lineId: string) => {
    setScannedLines((prev) => prev.filter((l) => l.id !== lineId));
  }, []);

  /* ---- Computed: grouped by article ---- */
  const groupedLines = useMemo(() => {
    const groups: Record<
      string,
      { articleCode: string; articleName: string; hsnCode: string; imageUrl: string; mrp: number; lines: ScannedLine[] }
    > = {};

    scannedLines.forEach((line) => {
      const key = line.articleCode;
      if (!groups[key]) {
        groups[key] = {
          articleCode: line.articleCode,
          articleName: line.articleName,
          hsnCode: line.hsnCode || "",
          imageUrl: line.imageUrl || "",
          mrp: line.mrp,
          lines: [],
        };
      }
      groups[key].lines.push(line);
    });

    return Object.values(groups);
  }, [scannedLines]);

  /* ---- Computed: size summary ---- */
  const sizeSummary: SizeSummaryRow[] = useMemo(() => {
    const map: Record<string, SizeSummaryRow> = {};

    scannedLines.forEach((line) => {
      if (!map[line.articleCode]) {
        map[line.articleCode] = {
          articleCode: line.articleCode,
          articleName: line.articleName,
          sizes: {},
          total: 0,
        };
      }
      const row = map[line.articleCode];
      const sizeKey = line.size;
      row.sizes[sizeKey] = (row.sizes[sizeKey] || 0) + line.qty;
      row.total += line.qty;
    });

    return Object.values(map);
  }, [scannedLines]);

  /* ---- Computed: totals ---- */
  const totalItems = scannedLines.length;
  const totalPairs = useMemo(
    () => scannedLines.reduce((sum, l) => sum + l.qty, 0),
    [scannedLines]
  );
  const totalValue = useMemo(
    () => scannedLines.reduce((sum, l) => sum + l.mrp * l.qty, 0),
    [scannedLines]
  );

  /* ---- Save / Confirm ---- */
  const buildOrderPayload = useCallback(
    (status: string) => ({
      orderNumber: orderNo,
      clientId,
      storeId,
      warehouseId,
      orderDate,
      status,
      lines: scannedLines.map((line) => ({
        articleId: line.articleId,
        articleCode: line.articleCode,
        size: line.size,
        quantity: line.qty,
        mrp: line.mrp,
        amount: line.mrp * line.qty,
      })),
      totalPairs,
      totalValue,
    }),
    [orderNo, clientId, storeId, warehouseId, orderDate, scannedLines, totalPairs, totalValue]
  );

  const handleSaveDraft = async () => {
    if (scannedLines.length === 0) {
      showFlash("error", "No items scanned. Scan at least one barcode.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/orders", buildOrderPayload("DRAFT"));
      showFlash("success", "Order saved as draft successfully.");
    } catch (err: any) {
      showFlash("error", err.response?.data?.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (scannedLines.length === 0) {
      showFlash("error", "No items scanned. Scan at least one barcode.");
      return;
    }
    setConfirmSaving(true);
    try {
      await api.post("/api/orders", buildOrderPayload("CONFIRMED"));
      showFlash("success", "Order confirmed successfully.");
    } catch (err: any) {
      showFlash("error", err.response?.data?.message || "Failed to confirm order.");
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
      {/* Flash notification */}
      {flash && (
        <ScanFlash
          type={flash.type}
          message={flash.message}
          onDone={() => setFlash(null)}
        />
      )}

      {/* ===== Page Header ===== */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ScanLine size={22} className="text-primary" />
            Barcode Scan Entry
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Scan barcodes to create orders instantly
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
              soundEnabled
                ? "bg-primary/10 border-primary/30 text-primary"
                : "hover:bg-muted"
            }`}
            title={soundEnabled ? "Sound on" : "Sound off"}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {soundEnabled ? "Sound On" : "Sound Off"}
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={saving || scannedLines.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors font-medium disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save as Draft"}
          </button>
          <button
            onClick={handleConfirmOrder}
            disabled={confirmSaving || scannedLines.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 shadow-sm"
          >
            <ShoppingCart size={14} />
            {confirmSaving ? "Confirming..." : "Confirm Order"}
          </button>
        </div>
      </div>

      {/* ===== Order Header ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-5 bg-card border rounded-xl shadow-sm">
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
        </div>

        {/* Store */}
        <div>
          <label className={labelCls}>Store</label>
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
                {s.storeCode} - {s.storeName}
              </option>
            ))}
          </select>
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

        {/* Order Date */}
        <div>
          <label className={labelCls}>Order Date</label>
          <input
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* ===== Barcode Input ===== */}
      <div className="relative">
        <div className="flex items-center gap-3 p-4 bg-card border-2 border-primary/30 rounded-xl shadow-sm focus-within:border-primary focus-within:shadow-lg focus-within:shadow-primary/10 transition-all">
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl shrink-0">
            <ScanLine size={24} className="text-primary" />
          </div>
          <div className="flex-1">
            <input
              ref={barcodeRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeScan}
              placeholder="Scan or type barcode + Enter... (e.g., B26FW001-39)"
              className="w-full text-lg font-mono bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd> to scan
              {" "}&middot;{" "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Esc</kbd> to clear
            </p>
          </div>
          {barcodeInput && (
            <button
              onClick={() => {
                setBarcodeInput("");
                barcodeRef.current?.focus();
              }}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X size={18} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* ===== Main Content: Table + Size Summary ===== */}
      {scannedLines.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-16 text-center">
          <ScanLine
            size={56}
            className="mx-auto text-muted-foreground/30 mb-4"
          />
          <h3 className="text-lg font-medium text-muted-foreground mb-1">
            No items scanned yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Scan a barcode using your scanner or type the barcode in the input
            field above and press Enter to start adding items to the order.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* ---- Scanned Items Table ---- */}
          <div className="xl:col-span-2 border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="px-5 py-3 bg-muted/40 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Package size={16} className="text-primary" />
                Scanned Items
              </h2>
              <span className="text-xs text-muted-foreground">
                {totalItems} line{totalItems !== 1 ? "s" : ""} &middot;{" "}
                {totalPairs} pair{totalPairs !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-10">
                      #
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Barcode
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Article
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Colour
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      MRP
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                      Qty
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedLines.map((group) => (
                    <>
                      {/* Article Group Header */}
                      <tr
                        key={`header-${group.articleCode}`}
                        className="bg-primary/5 border-b"
                      >
                        <td colSpan={9} className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0">
                              <Package
                                size={14}
                                className="text-muted-foreground"
                              />
                            </div>
                            <div>
                              <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded mr-2 font-bold">
                                {group.articleCode}
                              </span>
                              <span className="text-sm font-semibold">
                                {group.articleName}
                              </span>
                              {group.hsnCode && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  HSN: {group.hsnCode}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Individual line rows */}
                      {group.lines.map((line, lineIdx) => (
                        <tr
                          key={line.id}
                          className={`
                            border-b hover:bg-muted/30 transition-all duration-300
                            ${
                              lastScannedId === line.id
                                ? "bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800"
                                : ""
                            }
                          `}
                        >
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">
                            {lineIdx + 1}
                          </td>
                          <td className="px-4 py-2.5">
                            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                              {line.barcode}
                            </code>
                          </td>
                          <td className="px-4 py-2.5 text-sm">
                            {line.articleCode}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-muted-foreground">
                            {line.color || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-lg text-xs font-bold">
                              {line.size}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium">
                            {line.mrp > 0 ? formatCurrency(line.mrp) : "-"}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => adjustQty(line.id, -1)}
                                className="w-7 h-7 flex items-center justify-center rounded-md border hover:bg-muted transition-colors"
                                disabled={line.qty <= 1}
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-10 text-center font-bold text-sm">
                                {line.qty}
                              </span>
                              <button
                                onClick={() => adjustQty(line.id, 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-md border hover:bg-muted transition-colors"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-semibold">
                            {line.mrp > 0
                              ? formatCurrency(line.mrp * line.qty)
                              : "-"}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => removeLine(line.id)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                              title="Remove"
                            >
                              <Trash2
                                size={14}
                                className="text-destructive"
                              />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Running Totals */}
            <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-t">
              <div className="flex items-center gap-6 text-sm">
                <span className="text-muted-foreground">
                  Total Items:{" "}
                  <span className="font-bold text-foreground">
                    {totalItems}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Total Pairs:{" "}
                  <span className="font-bold text-foreground">
                    {totalPairs}
                  </span>
                </span>
              </div>
              <div className="text-sm font-semibold">
                Total Value:{" "}
                <span className="text-primary text-base">
                  {formatCurrency(totalValue)}
                </span>
              </div>
            </div>
          </div>

          {/* ---- Size-wise Summary Panel ---- */}
          <div className="border rounded-xl overflow-hidden bg-card shadow-sm h-fit">
            <div className="px-5 py-3 bg-muted/40 border-b">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Hash size={16} className="text-primary" />
                Size-wise Summary
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      Article
                    </th>
                    {SIZE_COLUMNS.map((s) => (
                      <th
                        key={s}
                        className="px-2 py-2 text-center font-bold text-primary whitespace-nowrap min-w-[36px]"
                      >
                        {s}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-bold text-foreground uppercase tracking-wider whitespace-nowrap">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sizeSummary.map((row) => (
                    <tr
                      key={row.articleCode}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs font-bold text-primary">
                          {row.articleCode}
                        </span>
                      </td>
                      {SIZE_COLUMNS.map((s) => (
                        <td key={s} className="px-2 py-2.5 text-center">
                          {row.sizes[s] ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 bg-primary/10 text-primary rounded font-bold text-xs">
                              {row.sizes[s]}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">
                              0
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-7 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded font-bold text-xs">
                          {row.total}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sizeSummary.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Scan items to see size summary
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Action Bar (bottom) ===== */}
      {scannedLines.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-card border rounded-xl shadow-sm sticky bottom-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Package size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Articles</p>
                <p className="text-lg font-bold">{groupedLines.length}</p>
              </div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Total Pairs</p>
              <p className="text-lg font-bold text-primary">{totalPairs}</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-lg font-bold text-emerald-600">
                {formatCurrency(totalValue)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (
                  confirm(
                    "Cancel this order? All scanned items will be cleared."
                  )
                ) {
                  setScannedLines([]);
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
              disabled={confirmSaving}
              className="flex items-center gap-1.5 px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 shadow-sm"
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

      {/* Inline animation styles */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
