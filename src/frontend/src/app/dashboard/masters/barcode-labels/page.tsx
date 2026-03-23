"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  QrCode,
  Printer,
  Download,
  Package,
  Settings2,
  Search,
  ChevronDown,
  X,
  Eye,
  Loader2,
} from "lucide-react";

/* ================================================================
   Types
   ================================================================ */

interface Article {
  articleId: string;
  articleCode: string;
  articleName: string;
  brandName: string;
  categoryName: string;
  segmentName: string;
  mrp: number;
  isSizeBased: boolean;
  isActive: boolean;
  color: string;
  groupName?: string;
}

interface Client {
  clientId: string;
  clientName: string;
}

interface Warehouse {
  warehouseId: string;
  warehouseName: string;
}

interface SizeConversion {
  euro: number;
  ind: string;
  uk: string;
  usa: string;
  cm: string;
}

interface LabelData {
  id: string;
  articleCode: string;
  articleName: string;
  color: string;
  groupName: string;
  euroSize: number;
  indSize: string;
  ukSize: string;
  usaSize: string;
  cmSize: string;
  mrp: number;
  eanCode: string;
  barcode: string;
  mfgMonth: string;
  quantity: number;
}

/* ================================================================
   Constants
   ================================================================ */

const SIZE_CONVERSIONS: SizeConversion[] = [
  { euro: 39, ind: "05", uk: "05", usa: "06", cm: "25.4" },
  { euro: 40, ind: "06", uk: "06", usa: "07", cm: "26.2" },
  { euro: 41, ind: "07", uk: "07", usa: "08", cm: "27.0" },
  { euro: 42, ind: "08", uk: "08", usa: "09", cm: "27.8" },
  { euro: 43, ind: "09", uk: "09", usa: "10", cm: "28.6" },
  { euro: 44, ind: "10", uk: "10", usa: "11", cm: "29.4" },
  { euro: 45, ind: "11", uk: "11", usa: "12", cm: "30.2" },
  { euro: 46, ind: "12", uk: "12", usa: "13", cm: "31.0" },
];

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

type GenerationMode = "article" | "client";
type PrintSize = "standard" | "large";

/* ================================================================
   Barcode Helpers
   ================================================================ */

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

function generateBarcode(articleCode: string, euroSize: number): string {
  const yearPrefix = new Date().getFullYear().toString().slice(-2);
  const codeClean = articleCode.replace(/-/g, "");
  const sizeStr = euroSize.toString().padStart(2, "0");
  return `B${yearPrefix}${codeClean}-${sizeStr}`;
}

/* ================================================================
   CSS Barcode Visualization
   ================================================================ */

function BarcodeVisualization({ code, height = 56, className = "" }: { code: string; height?: number; className?: string }) {
  const bars: { width: number; black: boolean }[] = useMemo(() => {
    const result: { width: number; black: boolean }[] = [];
    // Start guard: 101
    result.push({ width: 1, black: true });
    result.push({ width: 1, black: false });
    result.push({ width: 1, black: true });

    // Encode digits from code
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      // Generate varying width bars based on the character
      const w1 = ((charCode * 7 + i * 3) % 3) + 1;
      const w2 = ((charCode * 11 + i * 5) % 3) + 1;
      const w3 = ((charCode * 13 + i * 7) % 2) + 1;
      const w4 = ((charCode * 17 + i * 11) % 2) + 1;
      result.push({ width: w1, black: true });
      result.push({ width: w2, black: false });
      result.push({ width: w3, black: true });
      result.push({ width: w4, black: false });

      // Center guard after 6th digit
      if (i === 5) {
        result.push({ width: 1, black: false });
        result.push({ width: 1, black: true });
        result.push({ width: 1, black: false });
        result.push({ width: 1, black: true });
        result.push({ width: 1, black: false });
      }
    }

    // End guard: 101
    result.push({ width: 1, black: true });
    result.push({ width: 1, black: false });
    result.push({ width: 1, black: true });

    return result;
  }, [code]);

  return (
    <div className={`flex items-end justify-center ${className}`} style={{ height }}>
      {bars.map((bar, i) => (
        <div
          key={i}
          style={{
            width: `${bar.width}px`,
            height: `${height}px`,
            backgroundColor: bar.black ? "#000" : "transparent",
          }}
        />
      ))}
    </div>
  );
}

/* Small barcode for the right section */
function SmallBarcodeVisualization({ code }: { code: string }) {
  const bars = useMemo(() => {
    const result: { width: number; black: boolean }[] = [];
    for (let i = 0; i < Math.min(code.length, 8); i++) {
      const c = code.charCodeAt(i);
      result.push({ width: 1, black: true });
      result.push({ width: (c % 2) + 1, black: false });
    }
    result.push({ width: 1, black: true });
    return result;
  }, [code]);

  return (
    <div className="flex items-end justify-center" style={{ height: 28 }}>
      {bars.map((bar, i) => (
        <div
          key={i}
          style={{
            width: `${bar.width}px`,
            height: "28px",
            backgroundColor: bar.black ? "#000" : "transparent",
          }}
        />
      ))}
    </div>
  );
}

/* ================================================================
   QR Code Placeholder
   ================================================================ */

function QrCodePlaceholder() {
  return (
    <div className="w-[60px] h-[60px] border border-black p-0.5 bg-white">
      <div className="w-full h-full grid grid-cols-7 grid-rows-7 gap-px">
        {/* Simplified QR pattern */}
        {Array.from({ length: 49 }).map((_, i) => {
          const row = Math.floor(i / 7);
          const col = i % 7;
          // Corner squares
          const isCorner =
            (row < 3 && col < 3) ||
            (row < 3 && col > 3) ||
            (row > 3 && col < 3);
          // Center dot
          const isCenter = row === 3 && col === 3;
          const filled = isCorner || isCenter || (i * 7 + col * 3) % 5 === 0;
          return (
            <div
              key={i}
              className={filled ? "bg-black" : "bg-white"}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   Material Icon Component (shoe material symbols)
   ================================================================ */

function MaterialIcon({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-[18px] h-[18px] border border-black rounded-sm flex items-center justify-center">
        <span className="text-[6px] font-bold leading-none">{label}</span>
      </div>
      <span className="text-[6px] leading-none">{description}</span>
    </div>
  );
}

/* ================================================================
   Single Product Label Component
   ================================================================ */

function ProductLabel({
  label,
  printSize,
}: {
  label: LabelData;
  printSize: PrintSize;
}) {
  const dimensions = printSize === "standard"
    ? { width: "100mm", height: "75mm" }
    : { width: "120mm", height: "90mm" };

  const fontSize = printSize === "standard" ? "text-[7px]" : "text-[8px]";
  const fontSizeSm = printSize === "standard" ? "text-[6px]" : "text-[7px]";
  const fontSizeLg = printSize === "standard" ? "text-[9px]" : "text-[10px]";

  return (
    <div
      className="bg-white border border-gray-300 overflow-hidden font-sans print:border-black print:break-inside-avoid"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        padding: "3mm",
      }}
    >
      {/* === TOP ROW === */}
      <div className="flex gap-1 pb-1 border-b border-black" style={{ minHeight: "18mm" }}>
        {/* Left: QR + ISI */}
        <div className="flex flex-col items-center justify-between shrink-0" style={{ width: "22%" }}>
          <QrCodePlaceholder />
          <span className={`${fontSizeSm} mt-0.5 text-center leading-tight`}>www.elcurio.in</span>
          <div className={`${fontSizeSm} text-center leading-tight mt-0.5`}>
            <div className="font-bold">IS:17043</div>
            <div>PART 2</div>
            <div>CM/L-7654321</div>
          </div>
        </div>

        {/* Center: Article, Colour, Group */}
        <div className="flex-1 flex flex-col gap-0.5 justify-center px-1">
          <div className="border border-black px-1 py-0.5">
            <span className={`${fontSizeSm} text-gray-600`}>ARTICLE: </span>
            <span className={`${fontSize} font-bold`}>{label.articleName}</span>
          </div>
          <div className="border border-black px-1 py-0.5">
            <span className={`${fontSizeSm} text-gray-600`}>COLOUR: </span>
            <span className={`${fontSize} font-bold`}>{label.color || "BLACK"}</span>
          </div>
          <div className="border border-black px-1 py-0.5">
            <span className={`${fontSizeSm} text-gray-600`}>GROUP: </span>
            <span className={`${fontSize} font-bold`}>{label.groupName || "FORMAL"}</span>
          </div>
        </div>

        {/* Right: Material icons + Country */}
        <div className="flex flex-col justify-between shrink-0" style={{ width: "22%" }}>
          <div className="space-y-0.5">
            <MaterialIcon label="LEA" description="Upper" />
            <MaterialIcon label="LEA" description="Lining" />
            <MaterialIcon label="TPR" description="Sole" />
          </div>
          <div className={`${fontSizeSm} text-center mt-1 leading-tight`}>
            <div className="font-bold">COUNTRY OF</div>
            <div className="font-bold">ORIGIN: INDIA</div>
          </div>
        </div>
      </div>

      {/* === SIZE ROW === */}
      <div className="flex items-center justify-center gap-2 py-0.5 border-b border-black bg-gray-50">
        <span className={`${fontSizeLg} font-bold`}>SIZE</span>
        <span className={`${fontSize}`}>IND:<span className="font-bold">{label.indSize}</span></span>
        <span className={`${fontSize}`}>CM:<span className="font-bold">{label.cmSize}</span></span>
        <span className={`${fontSize}`}>EUR:<span className="font-bold">{label.euroSize}</span></span>
        <span className={`${fontSize}`}>UK:<span className="font-bold">{label.ukSize}</span></span>
        <span className={`${fontSize}`}>USA:<span className="font-bold">{label.usaSize}</span></span>
      </div>

      {/* === DETAILS SECTION === */}
      <div className="flex gap-1 py-1 border-b border-black" style={{ minHeight: "20mm" }}>
        {/* Left: Large barcode */}
        <div className="flex flex-col items-center justify-center shrink-0" style={{ width: "25%" }}>
          <BarcodeVisualization code={label.eanCode} height={40} />
          <span className={`${fontSizeSm} font-mono mt-0.5 tracking-wider`}>{label.eanCode}</span>
        </div>

        {/* Center: Product details */}
        <div className="flex-1 px-1 flex flex-col justify-center">
          <div className={`${fontSizeSm} leading-relaxed space-y-px`}>
            <div><span className="text-gray-600">COMMODITY: </span><span className="font-bold">LEATHER FOOTWEAR</span></div>
            <div><span className="text-gray-600">PRODUCT: </span><span className="font-bold">{label.articleName}</span></div>
            <div>
              <span className="text-gray-600">MRP: </span>
              <span className="font-bold text-[8px]">{"\u20B9"}{label.mrp.toLocaleString("en-IN")}</span>
              <span className="text-gray-600"> (PER PAIR)</span>
            </div>
            <div className="text-gray-600">INCLUSIVE OF ALL TAXES</div>
            <div><span className="text-gray-600">QUANTITY: </span><span className="font-bold">2 NOS 1PAIR</span></div>
            <div><span className="text-gray-600">MONTH & YEAR OF MFG: </span><span className="font-bold">{label.mfgMonth}</span></div>
            <div><span className="text-gray-600">EXPIRY DATE: </span><span>NOT APPLICABLE</span></div>
          </div>
        </div>

        {/* Right: Small barcode + article shortcode */}
        <div className="flex flex-col items-center justify-center shrink-0" style={{ width: "18%" }}>
          <SmallBarcodeVisualization code={label.barcode} />
          <div className={`${fontSizeSm} font-mono text-center mt-1 leading-tight`}>
            <div className="font-bold">{label.articleCode}</div>
            <div>{label.color || "BLK"}</div>
            <div>EU{label.euroSize}</div>
          </div>
        </div>
      </div>

      {/* === BOTTOM SECTION === */}
      <div className={`${fontSizeSm} leading-tight pt-0.5`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex gap-2">
              <span className="text-gray-600">EAN-13: </span>
              <span className="font-mono font-bold tracking-wider">{label.eanCode}</span>
            </div>
            <div>
              <span className="text-gray-600">BATCH NO: </span>
              <span className="font-bold">{label.articleCode}</span>
            </div>
          </div>
        </div>
        <div className="mt-0.5 text-center leading-tight">
          <div className="font-bold">MANUFACTURED & MARKETED BY: SKH EXPORTS</div>
          <div className="text-gray-700">NO.24/2B, PACHAYAPPA NAGAR, AMMOOR ROAD MANTHANGAL,</div>
          <div className="text-gray-700">RANIPET DIST, TAMIL NADU - 632 404 INDIA.</div>
          <div className="mt-0.5 text-gray-600">FOR ANY CONSUMER COMPLAINTS CONTACT:</div>
          <div className="font-bold">SKH EXPORTS (MANAGER) CUSTOMER CARE</div>
          <div className="text-gray-700">PHONE: +91-9042819942 EMAIL: support@elcurio.in</div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE COMPONENT
   ================================================================ */

export default function BarcodeLabelsPage() {
  /* ---- Data state ---- */
  const [articles, setArticles] = useState<Article[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  /* ---- Configuration state ---- */
  const [mode, setMode] = useState<GenerationMode>("article");
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [labelQtyPerSize, setLabelQtyPerSize] = useState(1);
  const [mfgMonth, setMfgMonth] = useState(() => {
    const now = new Date();
    return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  });
  const [printSize, setPrintSize] = useState<PrintSize>("standard");
  const [showConfig, setShowConfig] = useState(true);

  /* ---- Generated labels ---- */
  const [labels, setLabels] = useState<LabelData[]>([]);

  /* ---- Refs ---- */
  const printAreaRef = useRef<HTMLDivElement>(null);

  /* ---- Fetch articles ---- */
  const fetchArticles = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/articles", {
        params: { pageSize: 500 },
      });
      if (data.success) {
        setArticles(data.data?.items || []);
      }
    } catch {
      setArticles([]);
    }
  }, []);

  /* ---- Fetch clients ---- */
  const fetchClients = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/clients", {
        params: { pageSize: 200 },
      });
      if (data.success) {
        setClients(data.data?.items || []);
      }
    } catch {
      setClients([]);
    }
  }, []);

  /* ---- Fetch warehouses ---- */
  const fetchWarehouses = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/warehouses", {
        params: { pageSize: 50 },
      });
      if (data.success) {
        setWarehouses(data.data?.items || []);
      }
    } catch {
      setWarehouses([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchArticles(), fetchClients(), fetchWarehouses()]).finally(() =>
      setLoading(false)
    );
  }, [fetchArticles, fetchClients, fetchWarehouses]);

  /* ---- Selected article object ---- */
  const selectedArticle = useMemo(
    () => articles.find((a) => a.articleId === selectedArticleId) || null,
    [articles, selectedArticleId]
  );

  /* ---- Generate labels ---- */
  const handleGenerate = useCallback(() => {
    setGenerating(true);

    // Determine which articles to generate for
    let targetArticles: Article[] = [];

    if (mode === "article" && selectedArticle) {
      targetArticles = [selectedArticle];
    } else if (mode === "client") {
      // In client mode, generate for all active articles (in real app, this would filter by orders)
      targetArticles = articles.filter((a) => a.isActive && a.isSizeBased);
    }

    const generated: LabelData[] = [];

    targetArticles.forEach((article, artIdx) => {
      if (article.isSizeBased) {
        SIZE_CONVERSIONS.forEach((size, sizeIdx) => {
          const ean = generateEan13(artIdx, sizeIdx);
          const barcode = generateBarcode(article.articleCode, size.euro);

          for (let q = 0; q < labelQtyPerSize; q++) {
            generated.push({
              id: `${article.articleId}-${size.euro}-${q}`,
              articleCode: article.articleCode,
              articleName: article.articleName,
              color: article.color || "BLACK",
              groupName: article.groupName || article.categoryName || "FORMAL",
              euroSize: size.euro,
              indSize: size.ind,
              ukSize: size.uk,
              usaSize: size.usa,
              cmSize: size.cm,
              mrp: article.mrp,
              eanCode: ean,
              barcode: barcode,
              mfgMonth: mfgMonth,
              quantity: labelQtyPerSize,
            });
          }
        });
      } else {
        // Non-size-based articles get a single label per quantity
        const ean = generateEan13(artIdx, 0);
        const barcode = generateBarcode(article.articleCode, 0);

        for (let q = 0; q < labelQtyPerSize; q++) {
          generated.push({
            id: `${article.articleId}-ns-${q}`,
            articleCode: article.articleCode,
            articleName: article.articleName,
            color: article.color || "BLACK",
            groupName: article.groupName || article.categoryName || "GENERAL",
            euroSize: 0,
            indSize: "--",
            ukSize: "--",
            usaSize: "--",
            cmSize: "--",
            mrp: article.mrp,
            eanCode: ean,
            barcode: barcode,
            mfgMonth: mfgMonth,
            quantity: labelQtyPerSize,
          });
        }
      }
    });

    // Simulate a brief processing delay
    setTimeout(() => {
      setLabels(generated);
      setGenerating(false);
      if (generated.length > 0) {
        setShowConfig(false);
      }
    }, 400);
  }, [mode, selectedArticle, articles, labelQtyPerSize, mfgMonth]);

  /* ---- Print handler ---- */
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /* ---- Validation ---- */
  const canGenerate = useMemo(() => {
    if (mode === "article") return !!selectedArticleId;
    if (mode === "client") return !!selectedClientId;
    return false;
  }, [mode, selectedArticleId, selectedClientId]);

  return (
    <>
      {/* ---- Print-only styles ---- */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #label-print-area,
          #label-print-area * {
            visibility: visible !important;
          }
          #label-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          #label-print-area .label-item {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 2mm;
          }
          @page {
            size: ${printSize === "standard" ? "100mm 75mm" : "120mm 90mm"};
            margin: 0;
          }
        }
      `}</style>

      <div className="space-y-4 print:hidden">
        {/* ---- Page Header ---- */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <QrCode size={22} className="text-primary" />
              Barcode & Label Generation
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generate printable product labels with barcodes and QR codes
            </p>
          </div>
          <div className="flex items-center gap-2">
            {labels.length > 0 && (
              <>
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
                >
                  <Settings2 size={14} />
                  {showConfig ? "Hide" : "Show"} Settings
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
                >
                  <Printer size={14} />
                  Print All Labels
                </button>
              </>
            )}
          </div>
        </div>

        {/* ---- Generation Mode Tabs ---- */}
        <div className="border rounded-lg overflow-hidden">
          <div className="flex border-b bg-muted/30">
            <button
              onClick={() => { setMode("article"); setLabels([]); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                mode === "article"
                  ? "bg-white border-b-2 border-primary text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Package size={16} />
              By Article
            </button>
            <button
              onClick={() => { setMode("client"); setLabels([]); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                mode === "client"
                  ? "bg-white border-b-2 border-primary text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Download size={16} />
              By Client / Store
            </button>
          </div>

          {/* ---- Configuration Panel ---- */}
          {showConfig && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Article Selector */}
                {mode === "article" && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Article <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedArticleId}
                      onChange={(e) => setSelectedArticleId(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    >
                      <option value="">Select an article...</option>
                      {articles
                        .filter((a) => a.isActive)
                        .map((a) => (
                          <option key={a.articleId} value={a.articleId}>
                            {a.articleCode} - {a.articleName} ({a.color || "N/A"})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Client Selector */}
                {mode === "client" && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Client / Store <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    >
                      <option value="">Select a client/store...</option>
                      {clients.map((c) => (
                        <option key={c.clientId} value={c.clientId}>
                          {c.clientName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Warehouse Selector */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Warehouse
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    <option value="">All Warehouses</option>
                    {warehouses.map((w) => (
                      <option key={w.warehouseId} value={w.warehouseId}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Label Quantity Per Size */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Labels per Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={labelQtyPerSize}
                    onChange={(e) => setLabelQtyPerSize(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2.5 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Manufacturing Month */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Manufacturing Month/Year
                  </label>
                  <input
                    type="text"
                    value={mfgMonth}
                    onChange={(e) => setMfgMonth(e.target.value)}
                    placeholder="e.g. MAR 2026"
                    className="w-full px-3 py-2.5 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Print Size */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Print Size
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPrintSize("standard")}
                      className={`flex-1 px-3 py-2.5 text-sm rounded-lg border transition-colors ${
                        printSize === "standard"
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-input hover:bg-muted"
                      }`}
                    >
                      Standard
                      <span className="block text-[10px] text-muted-foreground mt-0.5">100mm x 75mm</span>
                    </button>
                    <button
                      onClick={() => setPrintSize("large")}
                      className={`flex-1 px-3 py-2.5 text-sm rounded-lg border transition-colors ${
                        printSize === "large"
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-input hover:bg-muted"
                      }`}
                    >
                      Large
                      <span className="block text-[10px] text-muted-foreground mt-0.5">120mm x 90mm</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Selected Article Preview */}
              {mode === "article" && selectedArticle && (
                <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <Eye size={16} className="text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{selectedArticle.articleName}</span>
                    <span className="text-muted-foreground mx-2">|</span>
                    <span className="text-muted-foreground">{selectedArticle.articleCode}</span>
                    <span className="text-muted-foreground mx-2">|</span>
                    <span className="text-muted-foreground">{selectedArticle.color || "N/A"}</span>
                    <span className="text-muted-foreground mx-2">|</span>
                    <span className="font-medium text-primary">{formatCurrency(selectedArticle.mrp)}</span>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                    {selectedArticle.isSizeBased
                      ? `${SIZE_CONVERSIONS.length} sizes x ${labelQtyPerSize} = ${SIZE_CONVERSIONS.length * labelQtyPerSize} labels`
                      : `${labelQtyPerSize} label${labelQtyPerSize > 1 ? "s" : ""}`
                    }
                  </span>
                </div>
              )}

              {/* Generate Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate || generating}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <QrCode size={16} />
                  )}
                  {generating ? "Generating..." : "Generate Labels"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---- Labels Count Bar ---- */}
        {labels.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Package size={16} className="text-green-600" />
              <span className="font-medium text-green-800">
                {labels.length} label{labels.length !== 1 ? "s" : ""} generated
              </span>
              <span className="text-green-600">
                ({printSize === "standard" ? "100x75mm" : "120x90mm"} format)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setLabels([]); setShowConfig(true); }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-green-300 rounded-lg hover:bg-green-100 text-green-700 transition-colors"
              >
                <X size={14} />
                Clear
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1 px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
              >
                <Printer size={14} />
                Print All
              </button>
            </div>
          </div>
        )}

        {/* ---- Label Preview Grid ---- */}
        {labels.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 justify-items-center">
            {labels.map((label) => (
              <div key={label.id} className="label-item">
                <ProductLabel label={label} printSize={printSize} />
              </div>
            ))}
          </div>
        )}

        {/* ---- Empty State ---- */}
        {labels.length === 0 && !showConfig && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <QrCode size={48} className="text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Labels Generated</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Configure your options and click Generate Labels to start.
            </p>
            <button
              onClick={() => setShowConfig(true)}
              className="mt-4 px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
            >
              Open Settings
            </button>
          </div>
        )}

        {/* ---- Loading State ---- */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading articles and configuration...</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-3">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <span className="font-semibold text-primary">Shalive Solutions</span>{" "}
            RetailERP
          </p>
        </div>
      </div>

      {/* ---- Print Area (hidden on screen, visible on print) ---- */}
      <div id="label-print-area" ref={printAreaRef} className="hidden print:block">
        {labels.map((label) => (
          <div key={label.id} className="label-item">
            <ProductLabel label={label} printSize={printSize} />
          </div>
        ))}
      </div>
    </>
  );
}
