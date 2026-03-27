"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api, { type ApiResponse } from "@/lib/api";
import {
  QrCode,
  Printer,
  Settings2,
  ChevronDown,
  Loader2,
  RefreshCw,
} from "lucide-react";

/* ================================================================
   Types
   ================================================================ */

interface Article {
  articleId: string;
  articleCode: string;
  articleName: string;
  brandName: string;
  brandCode?: string;
  categoryName: string;
  subCategoryName?: string;
  segmentName: string;
  genderName?: string;
  mrp: number;
  isSizeBased: boolean;
  isActive: boolean;
  color: string;
  groupName?: string;
  footwearDetails?: {
    upperLeather?: string;
    liningLeather?: string;
    sole?: string;
  };
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
  brandCode: string;
  color: string;
  groupName: string;
  euroSize: number;
  indSize: string;
  ukSize: string;
  usaSize: string;
  cmSize: string;
  mrp: number;
  eanCode: string;
  batchNo: string;
  mfgMonth: string;
  commodity: string;
  productType: string;
  upperMaterial: string;
  liningMaterial: string;
  soleMaterial: string;
}

/* ================================================================
   Constants
   ================================================================ */

const SIZE_CONVERSIONS: SizeConversion[] = [
  { euro: 36, ind: "02", uk: "03", usa: "04", cm: "23.0" },
  { euro: 37, ind: "03", uk: "04", usa: "05", cm: "23.8" },
  { euro: 38, ind: "04", uk: "04", usa: "05", cm: "24.6" },
  { euro: 39, ind: "05", uk: "05", usa: "06", cm: "25.4" },
  { euro: 40, ind: "06", uk: "06", usa: "07", cm: "26.2" },
  { euro: 41, ind: "07", uk: "07", usa: "08", cm: "27.0" },
  { euro: 42, ind: "08", uk: "08", usa: "09", cm: "27.8" },
  { euro: 43, ind: "09", uk: "09", usa: "10", cm: "28.6" },
  { euro: 44, ind: "10", uk: "10", usa: "11", cm: "29.4" },
  { euro: 45, ind: "11", uk: "11", usa: "12", cm: "30.2" },
  { euro: 46, ind: "12", uk: "12", usa: "13", cm: "31.0" },
];

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

type GenerationMode = "article" | "client";

/* ================================================================
   EAN-13 Generation (check digit)
   ================================================================ */

function computeEan13CheckDigit(first12: string): string {
  const digits = first12.slice(0, 12).split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}

function generateEan13(articleIndex: number, sizeIndex: number): string {
  const base = "8596119";
  const artPart = articleIndex.toString().padStart(3, "0");
  const sizePart = sizeIndex.toString().padStart(2, "0");
  const partial = `${base}${artPart}${sizePart}`;
  const first12 = partial.slice(0, 12);
  return first12 + computeEan13CheckDigit(first12);
}

/* ================================================================
   SVG EAN-13 Barcode (proper ISO/IEC 15420 encoding)
   ================================================================ */

const EAN_L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
const EAN_G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];
const EAN_R = ["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];
const EAN_FIRST_DIGIT = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];

function encodeEan13ToBits(code: string): string {
  const ean = code.slice(0, 13).padEnd(13, "0");
  const d = ean.split("").map(Number);
  const pattern = EAN_FIRST_DIGIT[d[0]] ?? "LLLLLL";
  let bits = "101";
  for (let i = 0; i < 6; i++) bits += (pattern[i] === "L" ? EAN_L : EAN_G)[d[i + 1]];
  bits += "01010";
  for (let i = 0; i < 6; i++) bits += EAN_R[d[i + 7]];
  bits += "101";
  return bits; // 95 modules
}

function Ean13Barcode({
  code,
  width = 90,
  height = 44,
}: {
  code: string;
  width?: number;
  height?: number;
}) {
  const bits = useMemo(() => encodeEan13ToBits(code), [code]);
  const mw = width / 95;

  const rects = useMemo(() => {
    const result: { x: number; w: number }[] = [];
    let start = -1;
    for (let i = 0; i <= bits.length; i++) {
      const black = i < bits.length && bits[i] === "1";
      if (black && start === -1) start = i;
      else if (!black && start !== -1) {
        result.push({ x: start * mw, w: (i - start) * mw });
        start = -1;
      }
    }
    return result;
  }, [bits, mw]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={0} width={r.w} height={height} fill="black" />
      ))}
    </svg>
  );
}

/* ================================================================
   Small Code-39 style barcode for article label (right section)
   ================================================================ */

function ArticleBarcode({
  code,
  width = 48,
  height = 26,
}: {
  code: string;
  width?: number;
  height?: number;
}) {
  const bars = useMemo(() => {
    const result: { w: number; black: boolean }[] = [];
    result.push({ w: 2, black: true }, { w: 1, black: false });
    for (let i = 0; i < code.length; i++) {
      const c = code.charCodeAt(i);
      const n1 = ((c * 3 + i * 7) % 3) + 1;
      const n2 = ((c * 5 + i * 11) % 2) + 1;
      const n3 = ((c * 7 + i * 13) % 3) + 1;
      result.push({ w: n1, black: true }, { w: 1, black: false });
      result.push({ w: n2, black: true }, { w: n3, black: false });
    }
    result.push({ w: 2, black: true });
    return result;
  }, [code]);

  const totalW = bars.reduce((s, b) => s + b.w, 0);
  const scale = width / totalW;
  let cx = 0;
  const rects = bars
    .filter((b) => b.black)
    .map((b, i) => {
      // compute cumulative x
      let x = 0;
      for (let j = 0; j < i; j++) x += bars[j].w;
      // recompute properly
      return null;
    });

  // Recompute with proper x
  let px = 0;
  const finalRects: { x: number; w: number }[] = [];
  bars.forEach((b) => {
    if (b.black) finalRects.push({ x: px * scale, w: b.w * scale });
    px += b.w;
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      {finalRects.map((r, i) => (
        <rect key={i} x={r.x} y={0} width={r.w} height={height} fill="black" />
      ))}
    </svg>
  );
}

/* ================================================================
   QR Code Visual Placeholder
   ================================================================ */

function QrCodeBox({ size = 52 }: { size?: number }) {
  const s = size;
  const m = s / 9; // module size (7 modules + 1 quiet zone each side)
  const finderPattern = [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,0,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1],
  ];

  const cells: { x: number; y: number }[] = [];
  // Top-left finder
  finderPattern.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell) cells.push({ x: m + c * m, y: m + r * m });
    })
  );
  // Bottom-left finder
  finderPattern.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell) cells.push({ x: m + c * m, y: m * 10 + r * m });
    })
  );
  // Top-right finder
  finderPattern.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell) cells.push({ x: m * 10 + c * m, y: m + r * m });
    })
  );
  // Data pattern (deterministic from size)
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 12; j++) {
      if ((i * 3 + j * 7) % 5 === 0) {
        cells.push({ x: m * 2 + i * m * 0.7, y: m * 9 + j * m * 0.7 });
      }
    }
  }

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ display: "block" }}>
      <rect width={s} height={s} fill="white" />
      <rect x={0.5} y={0.5} width={s - 1} height={s - 1} fill="none" stroke="black" strokeWidth={0.8} />
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={m} height={m} fill="black" />
      ))}
    </svg>
  );
}

/* ================================================================
   Company Logo (BIS ISI-like mark)
   ================================================================ */

function CompanyLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" style={{ display: "block" }}>
      <rect x={0.5} y={0.5} width={27} height={27} rx={2} fill="white" stroke="black" strokeWidth={1.5} />
      {/* S shape */}
      <path
        d="M8 8 Q8 6 12 6 Q17 6 17 10 Q17 14 8 14 Q8 18 13 18 Q18 18 18 21 Q18 23 14 23 Q10 23 9 21"
        fill="none"
        stroke="black"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* I/vertical line */}
      <line x1={21} y1={6} x2={21} y2={23} stroke="black" strokeWidth={2} />
      <line x1={19} y1={6} x2={23} y2={6} stroke="black" strokeWidth={1.5} />
      <line x1={19} y1={23} x2={23} y2={23} stroke="black" strokeWidth={1.5} />
    </svg>
  );
}

/* ================================================================
   Shoe Type Icons (ISI footwear classification silhouettes)
   ================================================================ */

function ShoeIcon({ type }: { type: "derby" | "loafer" | "sandal" }) {
  return (
    <svg width={22} height={14} viewBox="0 0 22 14" style={{ display: "block" }}>
      {type === "derby" && (
        <>
          {/* Full covered derby / oxford */}
          <path d="M2 11 Q3 5 9 5 Q14 5 18 8 Q20 10 19 11 Z" fill="none" stroke="black" strokeWidth={1} />
          <path d="M8 5 Q8 2 12 2 Q16 2 17 5" fill="none" stroke="black" strokeWidth={0.8} />
          <line x1={4} y1={5} x2={9} y2={5} stroke="black" strokeWidth={0.8} />
          <line x1={2} y1={11} x2={19} y2={11} stroke="black" strokeWidth={1.2} />
          <rect x={2} y={11} width={17} height={1.5} fill="black" />
        </>
      )}
      {type === "loafer" && (
        <>
          {/* Loafer / slip-on */}
          <path d="M2 10 Q3 5 9 5 Q15 5 19 8 Q20 10 19 11 Z" fill="none" stroke="black" strokeWidth={1} />
          <path d="M6 5 Q7 3 11 3 Q14 3 15 5" fill="none" stroke="black" strokeWidth={0.8} />
          <path d="M9 5 Q10 6 11 5" fill="none" stroke="black" strokeWidth={0.8} />
          <line x1={2} y1={11} x2={19} y2={11} stroke="black" strokeWidth={1.2} />
          <rect x={2} y={11} width={17} height={1.5} fill="black" />
        </>
      )}
      {type === "sandal" && (
        <>
          {/* Open sandal */}
          <path d="M2 10 Q4 8 11 8 Q16 8 19 9 Q20 10 19 11 Z" fill="none" stroke="black" strokeWidth={1} />
          <line x1={7} y1={8} x2={7} y2={5} stroke="black" strokeWidth={0.8} />
          <line x1={11} y1={8} x2={11} y2={4} stroke="black" strokeWidth={0.8} />
          <line x1={15} y1={8} x2={15} y2={6} stroke="black" strokeWidth={0.8} />
          <line x1={7} y1={5} x2={15} y2={5} stroke="black" strokeWidth={0.8} />
          <line x1={2} y1={11} x2={19} y2={11} stroke="black" strokeWidth={1.2} />
          <rect x={2} y={11} width={17} height={1.5} fill="black" />
        </>
      )}
    </svg>
  );
}

/* ================================================================
   BIS Material Symbol Boxes (upper/lining/sole)
   ================================================================ */

function MaterialBox({ icon, label }: { icon: "upper" | "lining" | "sole"; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
      <div
        style={{
          width: "20px",
          height: "20px",
          border: "1px solid black",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "white",
        }}
      >
        <svg width={14} height={14} viewBox="0 0 14 14">
          {icon === "upper" && (
            /* shoe upper silhouette */
            <path
              d="M1 11 Q2 5 7 5 Q11 5 13 8 L13 11 Z"
              fill="none"
              stroke="black"
              strokeWidth={1.2}
            />
          )}
          {icon === "lining" && (
            /* insole / inner lining oval */
            <>
              <ellipse cx={7} cy={9} rx={5} ry={3} fill="none" stroke="black" strokeWidth={1.1} />
              <ellipse cx={7} cy={9} rx={2} ry={1.5} fill="none" stroke="black" strokeWidth={0.8} />
            </>
          )}
          {icon === "sole" && (
            /* diamond / rhombus for sole */
            <polygon
              points="7,2 12,7 7,12 2,7"
              fill="none"
              stroke="black"
              strokeWidth={1.2}
            />
          )}
        </svg>
      </div>
      <span
        style={{
          fontSize: "6.5px",
          fontWeight: "bold",
          fontFamily: "Arial, sans-serif",
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ================================================================
   Single Product Label — exact format matching sample image
   ================================================================ */

function ProductLabel({ label }: { label: LabelData }) {
  const colorAbbr = (label.color || "BLK").replace(/\s+/g, "").slice(0, 3).toUpperCase();
  const shortText = `${label.brandCode} ${label.articleName} ${colorAbbr} ${label.euroSize || ""}`.trim();

  const upperMat = (label.upperMaterial || "LEA").toUpperCase().slice(0, 3);
  const liningMat = (label.liningMaterial || "LEA").toUpperCase().slice(0, 3);
  const soleMat = (label.soleMaterial || "TPR").toUpperCase().slice(0, 3);

  const cellStyle: React.CSSProperties = {
    fontFamily: "Arial, Helvetica, sans-serif",
  };

  return (
    <div
      style={{
        width: "142mm",
        border: "2px solid black",
        borderRadius: "4mm",
        backgroundColor: "white",
        overflow: "hidden",
        fontFamily: "Arial, Helvetica, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* ── TOP SECTION ────────────────────────────────────── */}
      <div style={{ display: "flex", borderBottom: "2px solid black" }}>

        {/* Left col: QR + Certification marks */}
        <div
          style={{
            width: "26mm",
            borderRight: "2px solid black",
            padding: "1.5mm 1.5mm",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1mm",
            ...cellStyle,
          }}
        >
          <QrCodeBox size={46} />
          <div style={{ fontSize: "4.5pt", textAlign: "center", color: "#333" }}>
            www.elcurio.in
          </div>
          <div style={{ textAlign: "center", lineHeight: 1.3 }}>
            <div style={{ fontSize: "6.5pt", fontWeight: "bold" }}>IS:17043</div>
          </div>
          <CompanyLogo size={24} />
          <div style={{ fontSize: "5pt", textAlign: "center", lineHeight: 1.3 }}>
            <div>PART 2</div>
            <div>CM/L-6700146416</div>
          </div>
        </div>

        {/* Center col: Article / Colour / Group */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: "2px solid black",
            ...cellStyle,
          }}
        >
          <div
            style={{
              flex: 1,
              padding: "2mm 3mm",
              borderBottom: "1.5px solid black",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "12pt", fontWeight: "bold", letterSpacing: "0.3px" }}>
              ARTICLE: {label.articleName.toUpperCase()}
            </span>
          </div>
          <div
            style={{
              flex: 1,
              padding: "2mm 3mm",
              borderBottom: "1.5px solid black",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "12pt", fontWeight: "bold" }}>
              COLOUR: {(label.color || "BLACK").toUpperCase()}
            </span>
          </div>
          <div
            style={{
              flex: 1,
              padding: "2mm 3mm",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "12pt", fontWeight: "bold" }}>
              GROUP: {(label.groupName || "").toUpperCase()}
            </span>
          </div>
        </div>

        {/* Right col: Shoe icons + Material boxes + Country */}
        <div
          style={{
            width: "28mm",
            padding: "1.5mm",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1mm",
            ...cellStyle,
          }}
        >
          {/* Row 1: 3 shoe type silhouettes */}
          <div style={{ display: "flex", gap: "2px", justifyContent: "center" }}>
            <ShoeIcon type="derby" />
            <ShoeIcon type="loafer" />
            <ShoeIcon type="sandal" />
          </div>

          {/* Row 2: Material symbol boxes */}
          <div style={{ display: "flex", gap: "3px", justifyContent: "center" }}>
            <MaterialBox icon="upper" label={upperMat} />
            <MaterialBox icon="lining" label={liningMat} />
            <MaterialBox icon="sole" label={soleMat} />
          </div>

          {/* Row 3: Country of Origin */}
          <div
            style={{
              fontSize: "5.5pt",
              fontWeight: "bold",
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            COUNTRY OF<br />ORIGIN:INDIA
          </div>
        </div>
      </div>

      {/* ── SIZE ROW ───────────────────────────────────────── */}
      <div
        style={{
          borderBottom: "2px solid black",
          padding: "1.2mm 4mm",
          display: "flex",
          alignItems: "center",
          gap: "5mm",
          backgroundColor: "#fafafa",
          ...cellStyle,
        }}
      >
        <span style={{ fontSize: "13pt", fontWeight: "bold" }}>SIZE</span>
        <span style={{ fontSize: "9pt" }}>
          IND:<strong style={{ fontSize: "10pt" }}>{label.indSize}</strong>
        </span>
        <span style={{ fontSize: "9pt" }}>
          CM:<strong style={{ fontSize: "10pt" }}>{label.cmSize}</strong>
        </span>
        <span style={{ fontSize: "9pt" }}>
          EUR:<strong style={{ fontSize: "10pt" }}>{label.euroSize}</strong>
        </span>
        <span style={{ fontSize: "9pt" }}>
          UK:<strong style={{ fontSize: "10pt" }}>{label.ukSize}</strong>
        </span>
        <span style={{ fontSize: "9pt" }}>
          USA:<strong style={{ fontSize: "10pt" }}>{label.usaSize}</strong>
        </span>
      </div>

      {/* ── DETAILS SECTION ───────────────────────────────── */}
      <div style={{ display: "flex", borderBottom: "1.5px solid black" }}>

        {/* Left: EAN-13 barcode */}
        <div
          style={{
            width: "34mm",
            borderRight: "1.5px solid black",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2mm 1.5mm",
            gap: "1mm",
            ...cellStyle,
          }}
        >
          <Ean13Barcode code={label.eanCode} width={88} height={44} />
          <div
            style={{
              fontFamily: "Courier New, monospace",
              fontSize: "6pt",
              letterSpacing: "0.8px",
              textAlign: "center",
            }}
          >
            {label.eanCode}
          </div>
          <div style={{ fontSize: "6pt", textAlign: "center" }}>
            BATCH NO: {label.batchNo}
          </div>
        </div>

        {/* Center: Product details text */}
        <div
          style={{
            flex: 1,
            padding: "2mm 2.5mm",
            fontSize: "6.5pt",
            lineHeight: 1.65,
            ...cellStyle,
          }}
        >
          <div>
            <span style={{ color: "#444" }}>COMMODITY: </span>
            <strong>{label.commodity.toUpperCase()}</strong>
          </div>
          <div>
            <span style={{ color: "#444" }}>PRODUCT: </span>
            <strong>{label.productType.toUpperCase()}</strong>
          </div>
          <div>
            <span style={{ color: "#444" }}>MRP: </span>
            <strong style={{ fontSize: "8pt" }}>
              ₹ {label.mrp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </strong>
            <span style={{ color: "#444" }}> (PER PAIR)</span>
          </div>
          <div style={{ color: "#333" }}>INCLUSIVE OF ALL TAXES</div>
          <div>
            <span style={{ color: "#444" }}>QUANTITY:</span>
            <strong>2 NOS 1PAIR</strong>
          </div>
          <div>
            <span style={{ color: "#444" }}>MONTH &amp; YEAR OF MFG: </span>
            <strong>{label.mfgMonth}</strong>
          </div>
          <div>
            <span style={{ color: "#444" }}>EXPIRY DATE: </span>
            NOT APPLICABLE
          </div>
        </div>

        {/* Right: Short article barcode */}
        <div
          style={{
            width: "24mm",
            borderLeft: "1.5px solid black",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2mm 1mm",
            gap: "1.5mm",
            ...cellStyle,
          }}
        >
          <ArticleBarcode code={shortText} width={52} height={30} />
          <div
            style={{
              fontFamily: "Courier New, monospace",
              fontSize: "5.5pt",
              textAlign: "center",
              lineHeight: 1.4,
              wordBreak: "break-all",
            }}
          >
            {shortText}
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Manufacturer info ─────────────────────── */}
      <div
        style={{
          padding: "1.5mm 3mm",
          fontSize: "5.5pt",
          lineHeight: 1.5,
          textAlign: "center",
          ...cellStyle,
        }}
      >
        <div>
          <strong>MANUFACTURED &amp; MARKETED BY:SKH EXPORTS</strong>
        </div>
        <div>NO.24/2B, PACHAYAPPA NAGAR, AMMOOR ROAD MANTHANGAL, RANIPET DIST,</div>
        <div>TAMIL NADU - 632 404 INDIA.</div>
        <div style={{ marginTop: "0.8mm" }}>FOR ANY CONSUMER COMPLAINTS CONTACT:</div>
        <div>
          <strong>SKH EXPORTS (MANAGER) CUSTOMER CARE</strong>
        </div>
        <div>PHONE.+91-9042819942 EMAIL:support@elcurio.in</div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE COMPONENT
   ================================================================ */

export default function BarcodeLabelsPage() {
  /* ── Data state ── */
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Config state ── */
  const [mode, setMode] = useState<GenerationMode>("article");
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [batchPrefix, setBatchPrefix] = useState("FW");
  const [batchNumber, setBatchNumber] = useState("0001");
  const [labelQtyPerSize, setLabelQtyPerSize] = useState(1);
  const [mfgMonth, setMfgMonth] = useState(() => {
    const now = new Date();
    return `${MONTHS[now.getMonth()]}-${now.getFullYear().toString().slice(-2)}`;
  });
  const [showConfig, setShowConfig] = useState(true);
  const [generating, setGenerating] = useState(false);

  /* ── Generated labels ── */
  const [labels, setLabels] = useState<LabelData[]>([]);

  /* ── Fetch articles ── */
  const fetchArticles = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/articles", {
        params: { pageSize: 500 },
      });
      if (data.success) setArticles(data.data?.items || []);
    } catch {
      setArticles([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchArticles().finally(() => setLoading(false));
  }, [fetchArticles]);

  const selectedArticle = useMemo(
    () => articles.find((a) => a.articleId === selectedArticleId) || null,
    [articles, selectedArticleId]
  );

  /* ── Generate labels ── */
  const handleGenerate = useCallback(async () => {
    if (!selectedArticle && mode === "article") return;
    setGenerating(true);

    let targetArticles: Article[] = [];
    if (mode === "article" && selectedArticle) {
      // Fetch full article detail for footwear material info
      try {
        const { data } = await api.get<ApiResponse<any>>(
          `/api/articles/${selectedArticle.articleId}`
        );
        if (data.success && data.data) {
          targetArticles = [{ ...selectedArticle, ...data.data }];
        } else {
          targetArticles = [selectedArticle];
        }
      } catch {
        targetArticles = [selectedArticle];
      }
    } else if (mode === "client") {
      targetArticles = articles.filter((a) => a.isActive && a.isSizeBased);
    }

    const generated: LabelData[] = [];

    for (let artIdx = 0; artIdx < targetArticles.length; artIdx++) {
      const article = targetArticles[artIdx];

      const upperMat =
        article.footwearDetails?.upperLeather || "LEA";
      const liningMat =
        article.footwearDetails?.liningLeather || "LEA";
      const soleMat =
        article.footwearDetails?.sole || "TPR";

      // Commodity = segment, Product = gender + category
      const commodity = article.segmentName || "LEATHER FOOTWEAR";
      const productType = article.subCategoryName
        ? `${article.genderName ? article.genderName + "'S " : ""}${article.subCategoryName}`
        : `${article.genderName ? article.genderName + "'S " : ""}${article.categoryName}`;

      // Brand code (first 2 letters of brand name)
      const brandCode = (
        article.brandCode ||
        (article.brandName || "").slice(0, 2)
      ).toUpperCase();

      const batchNo = `${batchPrefix}-${batchNumber}`;

      // Fetch actual article sizes if available
      let sizes = SIZE_CONVERSIONS;
      try {
        const { data } = await api.get<ApiResponse<any>>(
          `/api/sizecharts/${article.articleId}`
        );
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          sizes = data.data.map((s: any) => {
            const conv =
              SIZE_CONVERSIONS.find((c) => c.euro === s.euroSize) ||
              SIZE_CONVERSIONS[3];
            return {
              euro: s.euroSize,
              ind: conv.ind,
              uk: String(s.ukSize ?? conv.uk),
              usa: String(s.usSize ?? conv.usa),
              cm: conv.cm,
              eanCode: s.eanCode || null,
            } as SizeConversion & { eanCode?: string | null };
          });
        }
      } catch {
        /* fall back to SIZE_CONVERSIONS */
      }

      if (article.isSizeBased) {
        (sizes as (SizeConversion & { eanCode?: string | null })[]).forEach(
          (size, sizeIdx) => {
            const ean =
              (size as any).eanCode || generateEan13(artIdx, sizeIdx);
            for (let q = 0; q < labelQtyPerSize; q++) {
              generated.push({
                id: `${article.articleId}-${size.euro}-${q}`,
                articleCode: article.articleCode,
                articleName: article.articleName,
                brandCode,
                color: article.color || "BLACK",
                groupName: article.groupName || article.categoryName || "",
                euroSize: size.euro,
                indSize: size.ind,
                ukSize: size.uk,
                usaSize: size.usa,
                cmSize: size.cm,
                mrp: article.mrp,
                eanCode: ean,
                batchNo,
                mfgMonth,
                commodity,
                productType,
                upperMaterial: upperMat,
                liningMaterial: liningMat,
                soleMaterial: soleMat,
              });
            }
          }
        );
      } else {
        const ean = generateEan13(artIdx, 0);
        for (let q = 0; q < labelQtyPerSize; q++) {
          generated.push({
            id: `${article.articleId}-ns-${q}`,
            articleCode: article.articleCode,
            articleName: article.articleName,
            brandCode,
            color: article.color || "BLACK",
            groupName: article.groupName || article.categoryName || "",
            euroSize: 0,
            indSize: "--",
            ukSize: "--",
            usaSize: "--",
            cmSize: "--",
            mrp: article.mrp,
            eanCode: ean,
            batchNo,
            mfgMonth,
            commodity,
            productType,
            upperMaterial: upperMat,
            liningMaterial: liningMat,
            soleMaterial: soleMat,
          });
        }
      }
    }

    setLabels(generated);
    setGenerating(false);
    if (generated.length > 0) setShowConfig(false);
  }, [mode, selectedArticle, articles, labelQtyPerSize, mfgMonth, batchPrefix, batchNumber]);

  /* ── Print ── */
  const handlePrint = useCallback(() => window.print(), []);

  const canGenerate = mode === "article" ? !!selectedArticleId : true;

  /* ── Article search filter ── */
  const [articleSearch, setArticleSearch] = useState("");
  const filteredArticles = useMemo(
    () =>
      articles.filter(
        (a) =>
          a.isActive &&
          (a.articleName.toLowerCase().includes(articleSearch.toLowerCase()) ||
            a.articleCode.toLowerCase().includes(articleSearch.toLowerCase()))
      ),
    [articles, articleSearch]
  );

  return (
    <>
      {/* ── Print-only styles ── */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #label-print-area,
          #label-print-area * { visibility: visible !important; }
          #label-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex;
            flex-wrap: wrap;
            gap: 4mm;
            padding: 4mm;
            box-sizing: border-box;
          }
          @page { size: A4; margin: 8mm; }
        }
      `}</style>

      <div className="space-y-4 print:hidden">
        {/* ── Page Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <QrCode size={22} className="text-primary" />
              Barcode & Label Generation
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generate printable product labels — EAN-13 barcode with article master data
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
                  Print All ({labels.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Mode Tabs ── */}
        {showConfig && (
          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="flex border-b bg-muted/30">
              {(["article", "client"] as GenerationMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setLabels([]); }}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors capitalize ${
                    mode === m
                      ? "bg-background border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "article" ? "By Article" : "By Client / Order"}
                </button>
              ))}
            </div>

            <div className="p-4 grid grid-cols-2 gap-4">
              {/* Article selector */}
              {mode === "article" && (
                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-medium">Article *</label>
                  <div className="relative">
                    <input
                      placeholder="Search article…"
                      value={articleSearch}
                      onChange={(e) => setArticleSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {loading && (
                      <Loader2 size={14} className="absolute right-3 top-2.5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {filteredArticles.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        {loading ? "Loading…" : "No articles found"}
                      </div>
                    ) : (
                      filteredArticles.map((a) => (
                        <button
                          key={a.articleId}
                          onClick={() => setSelectedArticleId(a.articleId)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between transition-colors ${
                            selectedArticleId === a.articleId ? "bg-primary/10 text-primary font-medium" : ""
                          }`}
                        >
                          <span>
                            <span className="font-mono text-xs text-muted-foreground mr-2">
                              {a.articleCode}
                            </span>
                            {a.articleName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ₹{a.mrp.toLocaleString("en-IN")}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Batch number */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Batch Prefix</label>
                <input
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                  maxLength={4}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Batch Number</label>
                <input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  maxLength={6}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
              </div>

              {/* MFG month */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Month &amp; Year of MFG</label>
                <input
                  value={mfgMonth}
                  onChange={(e) => setMfgMonth(e.target.value.toUpperCase())}
                  placeholder="NOV-25"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
              </div>

              {/* Labels per size */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Labels per Size</label>
                <select
                  value={labelQtyPerSize}
                  onChange={(e) => setLabelQtyPerSize(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {[1, 2, 3, 5, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Generate button */}
              <div className="col-span-2 flex justify-end pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate || generating}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generating ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <RefreshCw size={15} />
                  )}
                  {generating ? "Generating…" : "Generate Labels"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Preview header ── */}
        {labels.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{labels.length} label{labels.length !== 1 ? "s" : ""} generated</span>
            <span className="text-xs">Scroll to preview · Use Print button for physical labels</span>
          </div>
        )}
      </div>

      {/* ── Label Preview Area ── */}
      {labels.length > 0 && (
        <div
          id="label-print-area"
          className="mt-4 flex flex-wrap gap-4"
          style={{ backgroundColor: "#e8eaf0", padding: "16px", borderRadius: "8px" }}
        >
          {labels.map((label) => (
            <div key={label.id} className="label-item">
              <ProductLabel label={label} />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {labels.length === 0 && !loading && (
        <div className="mt-8 text-center text-sm text-muted-foreground py-12 border-2 border-dashed rounded-lg">
          <QrCode size={32} className="mx-auto mb-2 opacity-30" />
          <p>Select an article and click <strong>Generate Labels</strong> to preview</p>
        </div>
      )}
    </>
  );
}
