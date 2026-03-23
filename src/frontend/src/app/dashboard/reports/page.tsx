"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3,
  Download,
  FileText,
  Package,
  Factory,
  Calendar,
  RefreshCw,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Users,
  Truck,
  Receipt,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
} from "lucide-react";
import api, { type ApiResponse } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

/* =================================================================
   Types
   ================================================================= */

interface DropdownItem {
  id: string;
  name: string;
}

type ReportTab =
  | "sales"
  | "inventory"
  | "production"
  | "intent"
  | "consignment"
  | "gst"
  | "valuation"
  | "invoice"
  | "packing";

type SalesView = "day" | "month" | "quarter" | "year";
type SalesSubView = "register" | "summary";

type PeriodShortcut =
  | "today"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "custom";

type ReportFormat = "summary" | "detailed";

/* =================================================================
   CSV Export Utility
   ================================================================= */

function exportToCSV(
  data: any[],
  columns: { key: string; header: string }[],
  filename: string
) {
  if (!data.length) return;
  const header = columns.map((c) => c.header).join(",");
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key] ?? "";
        const str = String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* =================================================================
   Date Helpers
   ================================================================= */

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getStartOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function getStartOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

function getStartOfQuarter(): string {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3);
  d.setMonth(q * 3, 1);
  return d.toISOString().split("T")[0];
}

function getStartOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function getFinancialYear(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth();
  const year = d.getFullYear();
  if (month >= 3) return `FY ${year}-${(year + 1).toString().slice(2)}`;
  return `FY ${year - 1}-${year.toString().slice(2)}`;
}

function getFinancialQuarter(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth();
  if (month >= 3 && month <= 5) return "Q1";
  if (month >= 6 && month <= 8) return "Q2";
  if (month >= 9 && month <= 11) return "Q3";
  return "Q4";
}

function getYearMonth(dateStr: string): string {
  return dateStr.substring(0, 7);
}

/* =================================================================
   Reference Data
   ================================================================= */

const CLIENTS = [
  "Lifestyle International",
  "Shoppers Stop",
  "Pantaloons",
  "Reliance Trends",
  "Max Fashion",
];

const STORES = [
  "Mumbai - Andheri",
  "Delhi - Connaught Place",
  "Bangalore - MG Road",
  "Chennai - T Nagar",
  "Hyderabad - Banjara Hills",
];

const DIVISIONS = ["Menswear", "Womenswear", "Kids", "Accessories", "Ethnic"];
const SECTIONS = ["Casual", "Formal", "Festive", "Party", "Daily"];
const ARTICLES = [
  "EC-POLO-001",
  "EC-SHIRT-042",
  "EC-KURTA-015",
  "EC-DRESS-028",
  "EC-JACKET-007",
  "EC-CHINO-033",
  "EC-DENIM-019",
  "EC-BLAZE-005",
];
const ARTICLE_NAMES = [
  "Classic Polo T-Shirt",
  "Slim Fit Cotton Shirt",
  "Printed Silk Kurta",
  "A-Line Floral Dress",
  "Bomber Jacket Quilted",
  "Slim Chino Trouser",
  "Stretch Denim Jeans",
  "Single Breasted Blazer",
];
const BRANDS = [
  "El Curio",
  "El Curio Premium",
  "El Curio Ethnics",
  "El Curio Women",
  "El Curio Casual",
];
const CATEGORIES = [
  "Polo T-Shirt",
  "Formal Shirt",
  "Kurta",
  "Dress",
  "Jacket",
  "Trousers",
  "Denim",
  "Blazer",
];
const STYLES = [
  "Classic",
  "Slim Fit",
  "Regular",
  "Relaxed",
  "Tailored",
  "Oversized",
];
const COLOURS = [
  "Navy Blue",
  "White",
  "Black",
  "Olive",
  "Maroon",
  "Grey",
  "Beige",
  "Teal",
];
const SIZES = ["S", "M", "L", "XL", "XXL", "38", "40", "42", "44"];
const CHANNELS = ["Inhouse", "Branded"];
const SALES_TYPES = ["SOR", "Outright"];
const SALESMEN = [
  "Rajesh Kumar",
  "Priya Sharma",
  "Amit Patel",
  "Neha Gupta",
  "Vikram Singh",
];
const HSN_CODES = ["6109", "6105", "6106", "6104", "6201", "6203", "6204"];
const TAX_DESCRIPTIONS = ["GST 5%", "GST 12%", "GST 18%"];
const STATES = [
  "Maharashtra",
  "Delhi",
  "Karnataka",
  "Tamil Nadu",
  "Telangana",
  "Gujarat",
  "West Bengal",
  "Rajasthan",
];
const CITIES = [
  "Mumbai",
  "New Delhi",
  "Bangalore",
  "Chennai",
  "Hyderabad",
  "Ahmedabad",
  "Kolkata",
  "Jaipur",
];
const STREETS = [
  "MG Road",
  "Park Street",
  "Brigade Road",
  "Anna Salai",
  "Jubilee Hills Road",
  "CG Road",
  "Camac Street",
  "MI Road",
];
const AREAS = [
  "Phase 1, Industrial Area",
  "Sector 5, Commercial Complex",
  "Block A, Trade Centre",
  "Wing B, Business Park",
  "Tower C, Tech Park",
  "Gate 3, Export Zone",
];
const UOM_LIST = ["Pair", "Pcs", "Set", "Dozen"];
const TRANSPORT_MODES = ["Road", "Rail", "Air", "Sea"];
const LOGISTICS = [
  "Delhivery",
  "BlueDart",
  "DTDC",
  "FedEx",
  "Gati",
  "Rivigo",
];

/* =================================================================
   Mock Data Generators
   ================================================================= */

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length];
}

function rand(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

function randDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - rand(0, daysBack));
  return d.toISOString().split("T")[0];
}

function generateDetailedSalesRegister(): any[] {
  const data: any[] = [];
  for (let i = 0; i < 30; i++) {
    const artIdx = i % ARTICLES.length;
    const mrp = Math.round((800 + Math.random() * 4200) / 10) * 10;
    const rsp = Math.round(mrp * (0.7 + Math.random() * 0.2));
    const qty = rand(1, 20);
    const billValue = rsp * qty;
    const discountAmt = Math.round(billValue * (Math.random() * 0.15));
    const promoAmt = Math.round(billValue * (Math.random() * 0.05));
    const taxDesc = pick(TAX_DESCRIPTIONS, i);
    const taxRate = taxDesc === "GST 5%" ? 0.05 : taxDesc === "GST 12%" ? 0.12 : 0.18;
    const taxableValue = billValue - discountAmt - promoAmt;
    const taxAmt = Math.round(taxableValue * taxRate);
    const netValue = taxableValue + taxAmt;
    const billDate = randDate(60);
    const month = new Date(billDate).toLocaleString("en-IN", {
      month: "short",
      year: "numeric",
    });

    data.push({
      party: pick(CLIENTS, i),
      division: pick(DIVISIONS, i),
      section: pick(SECTIONS, i),
      articleCode: pick(ARTICLES, artIdx),
      articleName: pick(ARTICLE_NAMES, artIdx),
      brand: pick(BRANDS, i),
      category: pick(CATEGORIES, artIdx),
      style: pick(STYLES, i),
      color: pick(COLOURS, i),
      size: pick(SIZES, i),
      barcode: `89${rand(10000000000, 99999999999)}`,
      mrp,
      rsp,
      hsnCode: pick(HSN_CODES, artIdx),
      channel: pick(CHANNELS, i),
      salesType: pick(SALES_TYPES, i),
      salesmanName: pick(SALESMEN, i),
      month,
      billDate,
      billNo: `INV-${2600 + i}`,
      billQty: qty,
      billValue,
      discountAmount: discountAmt,
      promoAmount: promoAmt,
      taxDescription: taxDesc,
      taxAmount: taxAmt,
      netValue,
    });
  }
  return data.sort((a, b) => b.billDate.localeCompare(a.billDate));
}

function generateSalesSummary(
  detailedData: any[],
  groupBy: SalesView
): any[] {
  const groups: Record<string, any> = {};

  detailedData.forEach((row) => {
    let key: string;
    switch (groupBy) {
      case "day":
        key = row.billDate;
        break;
      case "month":
        key = getYearMonth(row.billDate);
        break;
      case "quarter": {
        const fy = getFinancialYear(row.billDate);
        const q = getFinancialQuarter(row.billDate);
        key = `${q} ${fy}`;
        break;
      }
      case "year":
        key = getFinancialYear(row.billDate);
        break;
      default:
        key = row.billDate;
    }

    if (!groups[key]) {
      groups[key] = {
        period: key,
        totalOrders: 0,
        totalQty: 0,
        totalValue: 0,
        totalDiscount: 0,
        totalTax: 0,
        netValue: 0,
      };
    }
    groups[key].totalOrders += 1;
    groups[key].totalQty += row.billQty;
    groups[key].totalValue += row.billValue;
    groups[key].totalDiscount += row.discountAmount;
    groups[key].totalTax += row.taxAmount;
    groups[key].netValue += row.netValue;
  });

  return Object.values(groups).sort((a, b) =>
    b.period.localeCompare(a.period)
  );
}

function generateInventoryData(): any[] {
  const warehouses = ["Main Warehouse", "Mumbai Hub", "Delhi Hub"];
  const data: any[] = [];
  warehouses.forEach((wh) => {
    ARTICLES.forEach((art, idx) => {
      const opening = rand(50, 250);
      const received = rand(20, 120);
      const issued = rand(10, opening + received - 10);
      const returns = rand(0, 10);
      const closing = opening + received - issued + returns;
      const unitValue = rand(600, 2600);
      data.push({
        article: art,
        category: CATEGORIES[idx],
        warehouse: wh,
        opening,
        received,
        issued,
        returns,
        closing,
        value: closing * unitValue,
      });
    });
  });
  return data;
}

function generateProductionData(): any[] {
  const types = ["Cut-to-Pack", "Fabric-to-Finish", "Assembly"];
  const statuses = ["Completed", "In Progress", "Pending", "Delayed"];
  return Array.from({ length: 15 }, (_, i) => {
    const totalQty = rand(100, 600);
    const statusVal = pick(statuses, i);
    const completedQty =
      statusVal === "Completed"
        ? totalQty
        : statusVal === "Pending"
          ? 0
          : Math.floor(totalQty * (0.3 + Math.random() * 0.5));
    return {
      orderNo: `PO-${1000 + i}`,
      article: pick(ARTICLES, i),
      date: randDate(45),
      type: pick(types, i),
      totalQty,
      completedQty,
      pendingQty: totalQty - completedQty,
      status: statusVal,
    };
  });
}

function generateIntentData(): any[] {
  const data: any[] = [];
  for (let i = 0; i < 20; i++) {
    const mrp = Math.round((999 + Math.random() * 3000) / 10) * 10;
    const qty = rand(5, 35);
    const mrpTotal = mrp * qty;
    const marginPct = rand(25, 40);
    const marginRs = Math.round(mrpTotal * (marginPct / 100));
    const gstOnMrpPct = 5;
    const gstOnMrpRs = Math.round(mrpTotal * (gstOnMrpPct / 100));
    const unitRs = Math.round(mrp * (1 - marginPct / 100));
    const gstOnUnitPct = 5;
    const gstOnUnitRs = Math.round(unitRs * qty * (gstOnUnitPct / 100));
    const tBilling = unitRs * qty + gstOnUnitRs;
    data.push({
      store: `${pick(CLIENTS, i)} - ${pick(CITIES, i)}`,
      client: pick(CLIENTS, i),
      hsn: pick(HSN_CODES, i),
      eanBarcode: `89${rand(10000000000, 99999999999)}`,
      styleName: pick(ARTICLE_NAMES, i),
      color: pick(COLOURS, i),
      size: pick(SIZES, i),
      mrp,
      qty,
      mrpTotal,
      marginPct,
      marginRs,
      gstOnMrpPct,
      gstOnMrpRs,
      unitRs,
      gstOnUnitPct,
      gstOnUnitRs,
      tBilling,
    });
  }
  return data;
}

function generateConsignmentData(): any[] {
  const names = [
    "Lifestyle International Pvt Ltd",
    "Shoppers Stop Ltd",
    "Pantaloons Fashion & Retail",
    "Reliance Retail Ltd",
    "Max Fashion India",
    "Westside (Trent Ltd)",
    "Central (Future Group)",
    "Brand Factory",
    "V-Mart Retail Ltd",
    "Spencer's Retail Ltd",
    "ABFRL (Aditya Birla)",
    "Arvind Fashions Ltd",
    "Raymond Ltd",
    "Madura Fashion & Lifestyle",
    "Bata India Ltd",
  ];
  return Array.from({ length: 15 }, (_, i) => ({
    slNo: i + 1,
    consigneeName: pick(names, i),
    address1: `${rand(100, 999)}, ${pick(STREETS, i)}`,
    address2: pick(AREAS, i),
    country: "India",
    state: pick(STATES, i),
    district: pick(CITIES, i),
    city: pick(CITIES, i),
    pincode: `${rand(100000, 999999)}`,
    phoneNo: `+91-${rand(2000, 9999)}-${rand(100000, 999999)}`,
    mobileNo: `+91-${rand(70000, 99999)}${rand(10000, 99999)}`,
    emailId: `${pick(names, i).split(" ")[0].toLowerCase()}@retail.com`,
    quantity: rand(50, 550),
    monthYear: `${pick(["Jan", "Feb", "Mar", "Oct", "Nov", "Dec"], i)}-${i < 6 ? "2026" : "2025"}`,
  }));
}

function generateGSTData(): any[] {
  const clientsGST = [
    { name: "Lifestyle International Pvt Ltd", gstin: "27AABCL1234A1ZA" },
    { name: "Shoppers Stop Ltd", gstin: "07AABCS5678B1ZB" },
    { name: "Pantaloons Fashion", gstin: "29AABCP9012C1ZC" },
    { name: "Reliance Retail Ltd", gstin: "27AABCR3456D1ZD" },
    { name: "Max Fashion India", gstin: "33AABCM7890E1ZE" },
  ];
  const data: any[] = [];
  for (let i = 0; i < 20; i++) {
    const cl = pick(clientsGST, i);
    const taxableValue = rand(5000, 55000);
    const isInterState = i % 3 === 0;
    const cgst = isInterState ? 0 : Math.round(taxableValue * 0.025);
    const sgst = isInterState ? 0 : Math.round(taxableValue * 0.025);
    const igst = isInterState ? Math.round(taxableValue * 0.05) : 0;
    const totalTax = cgst + sgst + igst;
    data.push({
      invoiceNo: `INV-${2600 + i}`,
      date: randDate(30),
      clientGSTIN: cl.gstin,
      clientName: cl.name,
      hsn: pick(HSN_CODES, i),
      taxableValue,
      cgst,
      sgst,
      igst,
      totalTax,
      invoiceValue: taxableValue + totalTax,
      type: isInterState ? "IGST" : "CGST/SGST",
      section: taxableValue > 25000 ? "B2B" : "B2C",
    });
  }
  return data;
}

function generateStockValuationData(): any[] {
  return ARTICLES.map((art, idx) => {
    const qtyOnHand = rand(20, 320);
    const mrp = Math.round((799 + Math.random() * 4200) / 10) * 10;
    const costPrice = Math.round(mrp * (0.4 + Math.random() * 0.2));
    return {
      article: art,
      category: pick(CATEGORIES, idx),
      brand: pick(BRANDS, idx),
      qtyOnHand,
      mrp,
      costPrice,
      stockValueMRP: qtyOnHand * mrp,
      stockValueCost: qtyOnHand * costPrice,
    };
  });
}

function generateInvoiceData(): any[] {
  const sizeKeys = [
    "sz_39",
    "sz_40",
    "sz_41",
    "sz_42",
    "sz_43",
    "sz_44",
    "sz_45",
    "sz_46",
  ];
  const data: any[] = [];
  for (let i = 0; i < 25; i++) {
    const isLocal = i % 3 !== 0;
    const mrpPerPair = Math.round((999 + Math.random() * 3000) / 10) * 10;
    const qty = rand(6, 48);
    const unitRate = Math.round(mrpPerPair * (0.55 + Math.random() * 0.15));
    const taxableValue = unitRate * qty;
    const gstRate = isLocal ? 0.09 : 0;
    const igstRate = isLocal ? 0 : 0.18;
    const sgstAmt = Math.round(taxableValue * gstRate);
    const cgstAmt = Math.round(taxableValue * gstRate);
    const igstAmt = Math.round(taxableValue * igstRate);
    const grandTotal = taxableValue + sgstAmt + cgstAmt + igstAmt;

    const sizeBreakdown: Record<string, number> = {};
    let remaining = qty;
    sizeKeys.forEach((sk, si) => {
      if (si === sizeKeys.length - 1) {
        sizeBreakdown[sk] = remaining;
      } else {
        const alloc = rand(0, Math.min(remaining, Math.ceil(qty / 4)));
        sizeBreakdown[sk] = alloc;
        remaining -= alloc;
      }
    });

    data.push({
      invoiceNo: `INV-${2600 + i}`,
      date: randDate(45),
      client: pick(CLIENTS, i),
      store: pick(STORES, i),
      hsn: pick(HSN_CODES, i),
      description: pick(ARTICLE_NAMES, i),
      qty,
      uom: pick(UOM_LIST, i),
      ...sizeBreakdown,
      mrpPerPair,
      unitRate,
      taxableValue,
      sgstPct: isLocal ? 9 : 0,
      sgstAmount: sgstAmt,
      cgstPct: isLocal ? 9 : 0,
      cgstAmount: cgstAmt,
      igstPct: isLocal ? 0 : 18,
      igstAmount: igstAmt,
      grandTotal,
      invoiceType: isLocal ? "Local" : "Export",
    });
  }
  return data.sort((a, b) => b.date.localeCompare(a.date));
}

function generatePackingData(): any[] {
  const data: any[] = [];
  const sizeKeys = [
    "sz_39",
    "sz_40",
    "sz_41",
    "sz_42",
    "sz_43",
    "sz_44",
    "sz_45",
    "sz_46",
  ];
  for (let i = 0; i < 25; i++) {
    const qty = rand(6, 36);
    const mrp = Math.round((999 + Math.random() * 3000) / 10) * 10;

    const sizeBreakdown: Record<string, number> = {};
    let remaining = qty;
    sizeKeys.forEach((sk, si) => {
      if (si === sizeKeys.length - 1) {
        sizeBreakdown[sk] = remaining;
      } else {
        const alloc = rand(0, Math.min(remaining, Math.ceil(qty / 4)));
        sizeBreakdown[sk] = alloc;
        remaining -= alloc;
      }
    });

    data.push({
      packingNo: `PKG-${3000 + i}`,
      invoiceNo: `INV-${2600 + (i % 25)}`,
      date: randDate(30),
      client: pick(CLIENTS, i),
      store: pick(STORES, i),
      cartonNo: `CTN-${rand(1000, 9999)}`,
      article: pick(ARTICLES, i),
      colour: pick(COLOURS, i),
      qty,
      uom: pick(UOM_LIST, i),
      ...sizeBreakdown,
      mrp,
      logistic: pick(LOGISTICS, i),
      transportMode: pick(TRANSPORT_MODES, i),
      vehicleNo: `${pick(["MH", "DL", "KA", "TN", "TS"], i)}-${rand(10, 99)}-${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i + 3) % 26))}-${rand(1000, 9999)}`,
      placeOfSupply: pick(STATES, i),
    });
  }
  return data.sort((a, b) => b.date.localeCompare(a.date));
}

/* =================================================================
   Summary Card Component
   ================================================================= */

function SummaryCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
  color: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}
        >
          <Icon size={18} />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {subtext && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>
      )}
    </div>
  );
}

/* =================================================================
   Report Table Component
   ================================================================= */

function ReportTable({
  columns,
  data,
  loading,
  emptyMessage = "No data available for the selected filters.",
  totalsRow,
  pageSize = 25,
}: {
  columns: {
    key: string;
    header: string;
    align?: "left" | "right" | "center";
    className?: string;
  }[];
  data: any[];
  loading: boolean;
  emptyMessage?: string;
  totalsRow?: Record<string, string | number>;
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const paginatedData = data.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [data]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  } ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    Loading report data...
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              <>
                {paginatedData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 whitespace-nowrap ${
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                              ? "text-center"
                              : "text-left"
                        }`}
                      >
                        {row[col.key] ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))}
                {totalsRow && page === totalPages && (
                  <tr className="border-t-2 border-primary/20 bg-muted/40 font-semibold">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-3 whitespace-nowrap ${
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                              ? "text-center"
                              : "text-left"
                        }`}
                      >
                        {totalsRow[col.key] ?? ""}
                      </td>
                    ))}
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {data.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t text-sm">
          <span className="text-muted-foreground text-xs">
            {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, data.length)} of {data.length} rows
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =================================================================
   Tab Header with Export
   ================================================================= */

function TabHeader({
  title,
  subtitle,
  onExport,
  children,
}: {
  title: string;
  subtitle?: string;
  onExport: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {children}
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-muted transition-colors font-medium"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>
    </div>
  );
}

/* =================================================================
   Sales Tab Sub-Component
   ================================================================= */

function SalesTab({
  loading,
  detailedData,
  salesSubView,
  setSalesSubView,
  salesView,
  setSalesView,
  onExport,
}: {
  loading: boolean;
  detailedData: any[];
  salesSubView: SalesSubView;
  setSalesSubView: (v: SalesSubView) => void;
  salesView: SalesView;
  setSalesView: (v: SalesView) => void;
  onExport: (data: any[], columns: { key: string; header: string }[], name: string) => void;
}) {
  const salesSummary = useMemo(() => {
    if (!detailedData.length)
      return { totalSales: 0, totalUnits: 0, avgOrderValue: 0, topClient: "-" };
    const totalSales = detailedData.reduce(
      (s: number, r: any) => s + (r.netValue || 0),
      0
    );
    const totalUnits = detailedData.reduce(
      (s: number, r: any) => s + (r.billQty || 0),
      0
    );
    const avgOrderValue = detailedData.length > 0 ? totalSales / detailedData.length : 0;
    const clientTotals: Record<string, number> = {};
    detailedData.forEach((r: any) => {
      clientTotals[r.party] = (clientTotals[r.party] || 0) + (r.netValue || 0);
    });
    const topClient =
      Object.entries(clientTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
    return { totalSales, totalUnits, avgOrderValue, topClient };
  }, [detailedData]);

  const summaryData = useMemo(
    () => generateSalesSummary(detailedData, salesView),
    [detailedData, salesView]
  );

  /* ---- Detailed Sales Register columns ---- */
  const registerColumns = [
    { key: "party", header: "Party (Store)" },
    { key: "division", header: "Division" },
    { key: "section", header: "Section" },
    { key: "articleName", header: "Article Name" },
    { key: "brand", header: "Brand" },
    { key: "category", header: "Category" },
    { key: "style", header: "Style" },
    { key: "color", header: "Color" },
    { key: "size", header: "Size", align: "center" as const },
    { key: "barcode", header: "Barcode" },
    { key: "mrp", header: "MRP", align: "right" as const },
    { key: "rsp", header: "RSP", align: "right" as const },
    { key: "hsnCode", header: "HSN Code" },
    { key: "channel", header: "Channel" },
    { key: "salesType", header: "Sales Type" },
    { key: "salesmanName", header: "Salesman" },
    { key: "month", header: "Month" },
    { key: "billDate", header: "Bill Date" },
    { key: "billNo", header: "Bill No" },
    { key: "billQty", header: "Bill Qty", align: "right" as const },
    { key: "billValue", header: "Bill Value", align: "right" as const },
    { key: "discountAmount", header: "Discount Amt", align: "right" as const },
    { key: "promoAmount", header: "Promo Amt", align: "right" as const },
    { key: "taxDescription", header: "Tax Desc" },
    { key: "taxAmount", header: "Tax Amount", align: "right" as const },
    { key: "netValue", header: "Net Value", align: "right" as const },
  ];

  /* ---- Summary columns ---- */
  const summaryColumns = [
    { key: "period", header: "Period" },
    { key: "totalOrders", header: "Total Orders", align: "right" as const },
    { key: "totalQty", header: "Total Qty", align: "right" as const },
    { key: "totalValue", header: "Total Value", align: "right" as const },
    { key: "totalDiscount", header: "Total Discount", align: "right" as const },
    { key: "totalTax", header: "Total Tax", align: "right" as const },
    { key: "netValue", header: "Net Value", align: "right" as const },
  ];

  /* ---- Format for display ---- */
  const formattedRegisterData = useMemo(
    () =>
      detailedData.map((r) => ({
        ...r,
        mrp: formatCurrency(r.mrp),
        rsp: formatCurrency(r.rsp),
        billValue: formatCurrency(r.billValue),
        discountAmount: formatCurrency(r.discountAmount),
        promoAmount: formatCurrency(r.promoAmount),
        taxAmount: formatCurrency(r.taxAmount),
        netValue: formatCurrency(r.netValue),
        billQty: Number(r.billQty).toLocaleString("en-IN"),
      })),
    [detailedData]
  );

  const formattedSummaryData = useMemo(
    () =>
      summaryData.map((r) => ({
        ...r,
        totalOrders: Number(r.totalOrders).toLocaleString("en-IN"),
        totalQty: Number(r.totalQty).toLocaleString("en-IN"),
        totalValue: formatCurrency(r.totalValue),
        totalDiscount: formatCurrency(r.totalDiscount),
        totalTax: formatCurrency(r.totalTax),
        netValue: formatCurrency(r.netValue),
      })),
    [summaryData]
  );

  /* ---- Totals for register ---- */
  const registerTotals = useMemo(() => {
    const totals = detailedData.reduce(
      (acc, r) => ({
        billQty: acc.billQty + (r.billQty || 0),
        billValue: acc.billValue + (r.billValue || 0),
        discountAmount: acc.discountAmount + (r.discountAmount || 0),
        promoAmount: acc.promoAmount + (r.promoAmount || 0),
        taxAmount: acc.taxAmount + (r.taxAmount || 0),
        netValue: acc.netValue + (r.netValue || 0),
      }),
      { billQty: 0, billValue: 0, discountAmount: 0, promoAmount: 0, taxAmount: 0, netValue: 0 }
    );
    return {
      party: "TOTAL",
      billQty: Number(totals.billQty).toLocaleString("en-IN"),
      billValue: formatCurrency(totals.billValue),
      discountAmount: formatCurrency(totals.discountAmount),
      promoAmount: formatCurrency(totals.promoAmount),
      taxAmount: formatCurrency(totals.taxAmount),
      netValue: formatCurrency(totals.netValue),
    };
  }, [detailedData]);

  /* ---- Totals for summary ---- */
  const summaryTotals = useMemo(() => {
    const totals = summaryData.reduce(
      (acc, r) => ({
        totalOrders: acc.totalOrders + (r.totalOrders || 0),
        totalQty: acc.totalQty + (r.totalQty || 0),
        totalValue: acc.totalValue + (r.totalValue || 0),
        totalDiscount: acc.totalDiscount + (r.totalDiscount || 0),
        totalTax: acc.totalTax + (r.totalTax || 0),
        netValue: acc.netValue + (r.netValue || 0),
      }),
      { totalOrders: 0, totalQty: 0, totalValue: 0, totalDiscount: 0, totalTax: 0, netValue: 0 }
    );
    return {
      period: "TOTAL",
      totalOrders: Number(totals.totalOrders).toLocaleString("en-IN"),
      totalQty: Number(totals.totalQty).toLocaleString("en-IN"),
      totalValue: formatCurrency(totals.totalValue),
      totalDiscount: formatCurrency(totals.totalDiscount),
      totalTax: formatCurrency(totals.totalTax),
      netValue: formatCurrency(totals.netValue),
    };
  }, [summaryData]);

  const handleExportRegister = () => {
    onExport(detailedData, registerColumns, "Sales_Register_Detailed");
  };

  const handleExportSummary = () => {
    onExport(summaryData, summaryColumns, `Sales_Summary_${salesView}wise`);
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={DollarSign}
          label="Total Sales"
          value={formatCurrency(salesSummary.totalSales)}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={ShoppingCart}
          label="Total Units"
          value={salesSummary.totalUnits.toLocaleString("en-IN")}
          color="bg-green-50 text-green-600"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Avg Order Value"
          value={formatCurrency(Math.round(salesSummary.avgOrderValue))}
          color="bg-purple-50 text-purple-600"
        />
        <SummaryCard
          icon={Users}
          label="Top Client"
          value={salesSummary.topClient}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      {/* Sub-view toggle: Register vs Summary */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          <button
            onClick={() => setSalesSubView("register")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
              salesSubView === "register"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileSpreadsheet size={13} />
            Detailed Register
          </button>
          <button
            onClick={() => setSalesSubView("summary")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
              salesSubView === "summary"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 size={13} />
            Sales Summary
          </button>
        </div>

        {salesSubView === "summary" && (
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            {(
              [
                { key: "day", label: "Day-wise" },
                { key: "month", label: "Month-wise" },
                { key: "quarter", label: "Quarter-wise" },
                { key: "year", label: "Year-wise" },
              ] as { key: SalesView; label: string }[]
            ).map((v) => (
              <button
                key={v.key}
                onClick={() => setSalesView(v.key)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                  salesView === v.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Register view */}
      {salesSubView === "register" && (
        <>
          <TabHeader
            title="Detailed Sales Register"
            subtitle="One row per line item per invoice -- full spreadsheet-level detail"
            onExport={handleExportRegister}
          />
          <ReportTable
            columns={registerColumns}
            data={formattedRegisterData}
            loading={loading}
            totalsRow={registerTotals}
          />
        </>
      )}

      {/* Summary view */}
      {salesSubView === "summary" && (
        <>
          <TabHeader
            title={`Sales Summary -- ${salesView === "day" ? "Day" : salesView === "month" ? "Month" : salesView === "quarter" ? "Quarter" : "Year"}-wise`}
            subtitle="Aggregated sales data grouped by the selected period"
            onExport={handleExportSummary}
          />
          <ReportTable
            columns={summaryColumns}
            data={formattedSummaryData}
            loading={loading}
            totalsRow={summaryTotals}
          />
        </>
      )}
    </div>
  );
}

/* =================================================================
   Inventory Tab Sub-Component
   ================================================================= */

function InventoryTab({
  data,
  loading,
  onExport,
}: {
  data: any[];
  loading: boolean;
  onExport: (data: any[], columns: { key: string; header: string }[], name: string) => void;
}) {
  const columns = [
    { key: "article", header: "Article" },
    { key: "category", header: "Category" },
    { key: "warehouse", header: "Warehouse" },
    { key: "opening", header: "Opening", align: "right" as const },
    { key: "received", header: "Received", align: "right" as const },
    { key: "issued", header: "Issued", align: "right" as const },
    { key: "returns", header: "Returns", align: "right" as const },
    { key: "closing", header: "Closing", align: "right" as const },
    { key: "value", header: "Value", align: "right" as const },
  ];

  const formatted = useMemo(
    () =>
      data.map((r) => ({
        ...r,
        opening: Number(r.opening).toLocaleString("en-IN"),
        received: Number(r.received).toLocaleString("en-IN"),
        issued: Number(r.issued).toLocaleString("en-IN"),
        returns: Number(r.returns).toLocaleString("en-IN"),
        closing: Number(r.closing).toLocaleString("en-IN"),
        value: formatCurrency(r.value),
      })),
    [data]
  );

  return (
    <div className="space-y-5">
      <TabHeader
        title="Inventory Stock Position"
        subtitle="Opening/Closing per article, grouped by warehouse"
        onExport={() => onExport(data, columns, "Inventory_Stock")}
      />
      <ReportTable columns={columns} data={formatted} loading={loading} />
    </div>
  );
}

/* =================================================================
   Production Tab Sub-Component
   ================================================================= */

function ProductionTab({
  data,
  loading,
  onExport,
}: {
  data: any[];
  loading: boolean;
  onExport: (data: any[], columns: { key: string; header: string }[], name: string) => void;
}) {
  const columns = [
    { key: "orderNo", header: "Order No" },
    { key: "article", header: "Article" },
    { key: "date", header: "Date" },
    { key: "type", header: "Type" },
    { key: "totalQty", header: "Total Qty", align: "right" as const },
    { key: "completedQty", header: "Completed Qty", align: "right" as const },
    { key: "pendingQty", header: "Pending Qty", align: "right" as const },
    { key: "status", header: "Status" },
  ];

  const formatted = useMemo(
    () =>
      data.map((r) => ({
        ...r,
        totalQty: Number(r.totalQty).toLocaleString("en-IN"),
        completedQty: Number(r.completedQty).toLocaleString("en-IN"),
        pendingQty: Number(r.pendingQty).toLocaleString("en-IN"),
      })),
    [data]
  );

  return (
    <div className="space-y-5">
      <TabHeader
        title="Production Orders"
        subtitle="Production orders with status breakdown"
        onExport={() => onExport(data, columns, "Production_Report")}
      />
      <ReportTable columns={columns} data={formatted} loading={loading} />
    </div>
  );
}

/* =================================================================
   Intent Format Tab Sub-Component
   ================================================================= */

function IntentTab({
  data,
  loading,
  onExport,
}: {
  data: any[];
  loading: boolean;
  onExport: (data: any[], columns: { key: string; header: string }[], name: string) => void;
}) {
  const columns = [
    { key: "store", header: "Store" },
    { key: "client", header: "Client" },
    { key: "hsn", header: "HSN" },
    { key: "eanBarcode", header: "EAN Barcode" },
    { key: "styleName", header: "Style Name" },
    { key: "color", header: "Color" },
    { key: "size", header: "Size", align: "center" as const },
    { key: "mrp", header: "MRP", align: "right" as const },
    { key: "qty", header: "QTY", align: "right" as const },
    { key: "mrpTotal", header: "MRP Total", align: "right" as const },
    { key: "marginPct", header: "Margin %", align: "right" as const },
    { key: "marginRs", header: "Margin Rs", align: "right" as const },
    { key: "gstOnMrpPct", header: "GST on MRP %", align: "right" as const },
    { key: "gstOnMrpRs", header: "GST Rs (MRP)", align: "right" as const },
    { key: "unitRs", header: "Unit Rs", align: "right" as const },
    { key: "gstOnUnitPct", header: "GST on Unit @5%", align: "right" as const },
    { key: "gstOnUnitRs", header: "GST Rs (Unit)", align: "right" as const },
    { key: "tBilling", header: "T Billing", align: "right" as const },
  ];

  const formatted = useMemo(
    () =>
      data.map((r) => ({
        ...r,
        mrp: formatCurrency(r.mrp),
        mrpTotal: formatCurrency(r.mrpTotal),
        marginPct: `${r.marginPct}%`,
        marginRs: formatCurrency(r.marginRs),
        gstOnMrpPct: `${r.gstOnMrpPct}%`,
        gstOnMrpRs: formatCurrency(r.gstOnMrpRs),
        unitRs: formatCurrency(r.unitRs),
        gstOnUnitPct: `${r.gstOnUnitPct}%`,
        gstOnUnitRs: formatCurrency(r.gstOnUnitRs),
        tBilling: formatCurrency(r.tBilling),
      })),
    [data]
  );

  return (
    <div className="space-y-5">
      <TabHeader
        title="Billing Intent / Pre-Invoice Calculation"
        subtitle="Intent format with MRP, margin, GST, and billing breakdown per SKU"
        onExport={() => onExport(data, columns, "Intent_Format")}
      />
      <ReportTable columns={columns} data={formatted} loading={loading} />
    </div>
  );
}

/* =================================================================
   Consignment Tab Sub-Component
   ================================================================= */

function ConsignmentTab({
  data,
  loading,
  onExport,
}: {
  data: any[];
  loading: boolean;
  onExport: (data: any[], columns: { key: string; header: string }[], name: string) => void;
}) {
  const columns = [
    { key: "slNo", header: "SL No", align: "center" as const },
    { key: "consigneeName", header: "Consignee's Name" },
    { key: "address1", header: "Address 1" },
    { key: "address2", header: "Address 2" },
    { key: "country", header: "Country" },
    { key: "state", header: "State" },
    { key: "district", header: "District" },
    { key: "city", header: "City" },
    { key: "pincode", header: "Pincode" },
    { key: "phoneNo", header: "Phone No" },
    { key: "mobileNo", header: "Mobile No" },
    { key: "emailId", header: "Email Id" },
    { key: "quantity", header: "Quantity", align: "right" as const },
    { key: "monthYear", header: "Month-Year" },
  ];

  const totalQty = useMemo(
    () => data.reduce((s: number, r: any) => s + (r.quantity || 0), 0),
    [data]
  );

  return (
    <div className="space-y-5">
      <TabHeader
        title="Consignment Report"
        subtitle="Store/client delivery addresses with quantities dispatched"
        onExport={() => onExport(data, columns, "Consignment_Report")}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Truck}
          label="Total Consignees"
          value={data.length.toString()}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={Package}
          label="Total Qty Dispatched"
          value={totalQty.toLocaleString("en-IN")}
          color="bg-green-50 text-green-600"
        />
      </div>
      <ReportTable
        columns={columns}
        data={data}
        loading={loading}
        totalsRow={{
          slNo: "",
          consigneeName: "TOTAL",
          quantity: totalQty.toLocaleString("en-IN"),
        }}
      />
    </div>
  );
}

/* =================================================================
   GST Tab Sub-Component
   ================================================================= */

function GSTTab({
  data,
  loading,
  onExport,
}: {
  data: any[];
  loading: boolean;
  onExport: (data: any[], columns: { key: string; header: string }[], name: string) => void;
}) {
  const columns = [
    { key: "invoiceNo", header: "Invoice No" },
    { key: "date", header: "Date" },
    { key: "clientGSTIN", header: "Client GSTIN" },
    { key: "clientName", header: "Client Name" },
    { key: "hsn", header: "HSN" },
    { key: "taxableValue", header: "Taxable Value", align: "right" as const },
    { key: "cgst", header: "CGST", align: "right" as const },
    { key: "sgst", header: "SGST", align: "right" as const },
    { key: "igst", header: "IGST", align: "right" as const },
    { key: "totalTax", header: "Total Tax", align: "right" as const },
    { key: "invoiceValue", header: "Invoice Value", align: "right" as const },
    { key: "section", header: "Section", align: "center" as const },
  ];

  const summary = useMemo(() => {
    return {
      totalTaxable: data.reduce((s: number, r: any) => s + (r.taxableValue || 0), 0),
      totalCGST: data.reduce((s: number, r: any) => s + (r.cgst || 0), 0),
      totalSGST: data.reduce((s: number, r: any) => s + (r.sgst || 0), 0),
      totalIGST: data.reduce((s: number, r: any) => s + (r.igst || 0), 0),
    };
  }, [data]);

  const formatted = useMemo(
    () =>
      data.map((r) => ({
        ...r,
        taxableValue: formatCurrency(r.taxableValue),
        cgst: formatCurrency(r.cgst),
        sgst: formatCurrency(r.sgst),
        igst: formatCurrency(r.igst),
        totalTax: formatCurrency(r.totalTax),
        invoiceValue: formatCurrency(r.invoiceValue),
      })),
    [data]
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={FileText}
          label="Total Taxable"
          value={formatCurrency(summary.totalTaxable)}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={Receipt}
          label="Total CGST"
          value={formatCurrency(summary.totalCGST)}
          color="bg-green-50 text-green-600"
        />
        <SummaryCard
          icon={Receipt}
          label="Total SGST"
          value={formatCurrency(summary.totalSGST)}
          color="bg-purple-50 text-purple-600"
        />
        <SummaryCard
          icon={Receipt}
          label="Total IGST"
          value={formatCurrency(summary.totalIGST)}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
            B2B: {data.filter((r: any) => r.section === "B2B").length} invoices
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
            B2C: {data.filter((r: any) => r.section === "B2C").length} invoices
          </span>
        </div>
        <button
          onClick={() => onExport(data, columns, "GST_Report")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-muted transition-colors font-medium"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      <ReportTable columns={columns} data={formatted} loading={loading} />
    </div>
  );
}

/* =================================================================
   Stock Valuation Tab Sub-Component
   ================================================================= */

function ValuationTab({
  data,
  loading,
  onExport,
}: {
  data: any[];
  loading: boolean;
  onExport: (data: any[], columns: { key: string; header: string }[], name: string) => void;
}) {
  const columns = [
    { key: "article", header: "Article" },
    { key: "category", header: "Category" },
    { key: "brand", header: "Brand" },
    { key: "qtyOnHand", header: "Qty on Hand", align: "right" as const },
    { key: "mrp", header: "MRP", align: "right" as const },
    { key: "costPrice", header: "Cost Price", align: "right" as const },
    { key: "stockValueMRP", header: "Value (at MRP)", align: "right" as const },
    { key: "stockValueCost", header: "Value (at Cost)", align: "right" as const },
  ];

  const totals = useMemo(() => {
    return {
      totalQty: data.reduce((s: number, r: any) => s + (r.qtyOnHand || 0), 0),
      totalMRP: data.reduce((s: number, r: any) => s + (r.stockValueMRP || 0), 0),
      totalCost: data.reduce((s: number, r: any) => s + (r.stockValueCost || 0), 0),
    };
  }, [data]);

  const formatted = useMemo(
    () =>
      data.map((r) => ({
        ...r,
        qtyOnHand: Number(r.qtyOnHand).toLocaleString("en-IN"),
        mrp: formatCurrency(r.mrp),
        costPrice: formatCurrency(r.costPrice),
        stockValueMRP: formatCurrency(r.stockValueMRP),
        stockValueCost: formatCurrency(r.stockValueCost),
      })),
    [data]
  );

  return (
    <div className="space-y-5">
      <TabHeader
        title="Stock Valuation"
        subtitle="Current stock value by article at MRP and cost price"
        onExport={() => onExport(data, columns, "Stock_Valuation")}
      />
      <ReportTable
        columns={columns}
        data={formatted}
        loading={loading}
        totalsRow={{
          article: "TOTAL",
          category: "",
          brand: "",
          qtyOnHand: totals.totalQty.toLocaleString("en-IN"),
          mrp: "",
          costPrice: "",
          stockValueMRP: formatCurrency(totals.totalMRP),
          stockValueCost: formatCurrency(totals.totalCost),
        }}
      />
    </div>
  );
}

/* =================================================================
   Invoice Report Tab Sub-Component
   ================================================================= */

function InvoiceTab({
  data,
  loading,
  onExport,
}: {
  data: any[];
  loading: boolean;
  onExport: (data: any[], columns: { key: string; header: string }[], name: string) => void;
}) {
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<string>("");

  const columns = [
    { key: "invoiceNo", header: "Invoice No" },
    { key: "date", header: "Date" },
    { key: "client", header: "Client" },
    { key: "store", header: "Store" },
    { key: "hsn", header: "HSN" },
    { key: "description", header: "Description" },
    { key: "qty", header: "Qty", align: "right" as const },
    { key: "uom", header: "UOM", align: "center" as const },
    { key: "sz_39", header: "39", align: "right" as const },
    { key: "sz_40", header: "40", align: "right" as const },
    { key: "sz_41", header: "41", align: "right" as const },
    { key: "sz_42", header: "42", align: "right" as const },
    { key: "sz_43", header: "43", align: "right" as const },
    { key: "sz_44", header: "44", align: "right" as const },
    { key: "sz_45", header: "45", align: "right" as const },
    { key: "sz_46", header: "46", align: "right" as const },
    { key: "mrpPerPair", header: "MRP/Pair", align: "right" as const },
    { key: "unitRate", header: "Unit Rate", align: "right" as const },
    { key: "taxableValue", header: "Taxable Value", align: "right" as const },
    { key: "sgstPct", header: "SGST%", align: "right" as const },
    { key: "sgstAmount", header: "SGST Amt", align: "right" as const },
    { key: "cgstPct", header: "CGST%", align: "right" as const },
    { key: "cgstAmount", header: "CGST Amt", align: "right" as const },
    { key: "igstPct", header: "IGST%", align: "right" as const },
    { key: "igstAmount", header: "IGST Amt", align: "right" as const },
    { key: "grandTotal", header: "Grand Total", align: "right" as const },
  ];

  const filteredData = useMemo(() => {
    if (!invoiceTypeFilter) return data;
    return data.filter((r) => r.invoiceType === invoiceTypeFilter);
  }, [data, invoiceTypeFilter]);

  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, r) => ({
        qty: acc.qty + (r.qty || 0),
        taxableValue: acc.taxableValue + (r.taxableValue || 0),
        sgstAmount: acc.sgstAmount + (r.sgstAmount || 0),
        cgstAmount: acc.cgstAmount + (r.cgstAmount || 0),
        igstAmount: acc.igstAmount + (r.igstAmount || 0),
        grandTotal: acc.grandTotal + (r.grandTotal || 0),
      }),
      { qty: 0, taxableValue: 0, sgstAmount: 0, cgstAmount: 0, igstAmount: 0, grandTotal: 0 }
    );
  }, [filteredData]);

  const formatted = useMemo(
    () =>
      filteredData.map((r) => ({
        ...r,
        mrpPerPair: formatCurrency(r.mrpPerPair),
        unitRate: formatCurrency(r.unitRate),
        taxableValue: formatCurrency(r.taxableValue),
        sgstPct: r.sgstPct ? `${r.sgstPct}%` : "-",
        sgstAmount: r.sgstAmount ? formatCurrency(r.sgstAmount) : "-",
        cgstPct: r.cgstPct ? `${r.cgstPct}%` : "-",
        cgstAmount: r.cgstAmount ? formatCurrency(r.cgstAmount) : "-",
        igstPct: r.igstPct ? `${r.igstPct}%` : "-",
        igstAmount: r.igstAmount ? formatCurrency(r.igstAmount) : "-",
        grandTotal: formatCurrency(r.grandTotal),
      })),
    [filteredData]
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Receipt}
          label="Total Invoices"
          value={filteredData.length.toString()}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={ShoppingCart}
          label="Total Qty"
          value={totals.qty.toLocaleString("en-IN")}
          color="bg-green-50 text-green-600"
        />
        <SummaryCard
          icon={DollarSign}
          label="Taxable Value"
          value={formatCurrency(totals.taxableValue)}
          color="bg-purple-50 text-purple-600"
        />
        <SummaryCard
          icon={DollarSign}
          label="Grand Total"
          value={formatCurrency(totals.grandTotal)}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      <TabHeader
        title="Invoice Report"
        subtitle="Tax invoice detail with size breakdown and GST split"
        onExport={() => onExport(filteredData, columns, "Invoice_Report")}
      >
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-muted-foreground" />
          <select
            value={invoiceTypeFilter}
            onChange={(e) => setInvoiceTypeFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Types</option>
            <option value="Local">Local</option>
            <option value="Export">Export</option>
          </select>
        </div>
      </TabHeader>

      <ReportTable
        columns={columns}
        data={formatted}
        loading={loading}
        totalsRow={{
          invoiceNo: "TOTAL",
          qty: totals.qty.toLocaleString("en-IN"),
          taxableValue: formatCurrency(totals.taxableValue),
          sgstAmount: formatCurrency(totals.sgstAmount),
          cgstAmount: formatCurrency(totals.cgstAmount),
          igstAmount: formatCurrency(totals.igstAmount),
          grandTotal: formatCurrency(totals.grandTotal),
        }}
      />
    </div>
  );
}

/* =================================================================
   Packing Report Tab Sub-Component
   ================================================================= */

function PackingTab({
  data,
  loading,
  onExport,
}: {
  data: any[];
  loading: boolean;
  onExport: (data: any[], columns: { key: string; header: string }[], name: string) => void;
}) {
  const columns = [
    { key: "packingNo", header: "Packing No" },
    { key: "invoiceNo", header: "Invoice No" },
    { key: "date", header: "Date" },
    { key: "client", header: "Client" },
    { key: "store", header: "Store" },
    { key: "cartonNo", header: "Carton No" },
    { key: "article", header: "Article" },
    { key: "colour", header: "Colour" },
    { key: "qty", header: "Qty", align: "right" as const },
    { key: "uom", header: "UOM", align: "center" as const },
    { key: "sz_39", header: "39", align: "right" as const },
    { key: "sz_40", header: "40", align: "right" as const },
    { key: "sz_41", header: "41", align: "right" as const },
    { key: "sz_42", header: "42", align: "right" as const },
    { key: "sz_43", header: "43", align: "right" as const },
    { key: "sz_44", header: "44", align: "right" as const },
    { key: "sz_45", header: "45", align: "right" as const },
    { key: "sz_46", header: "46", align: "right" as const },
    { key: "mrp", header: "MRP", align: "right" as const },
    { key: "logistic", header: "Logistic" },
    { key: "transportMode", header: "Transport Mode" },
    { key: "vehicleNo", header: "Vehicle No" },
    { key: "placeOfSupply", header: "Place of Supply" },
  ];

  const totalQty = useMemo(
    () => data.reduce((s: number, r: any) => s + (r.qty || 0), 0),
    [data]
  );

  const formatted = useMemo(
    () =>
      data.map((r) => ({
        ...r,
        mrp: formatCurrency(r.mrp),
      })),
    [data]
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Package}
          label="Total Packing Entries"
          value={data.length.toString()}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={ShoppingCart}
          label="Total Qty Packed"
          value={totalQty.toLocaleString("en-IN")}
          color="bg-green-50 text-green-600"
        />
        <SummaryCard
          icon={Truck}
          label="Unique Cartons"
          value={new Set(data.map((r) => r.cartonNo)).size.toString()}
          color="bg-purple-50 text-purple-600"
        />
        <SummaryCard
          icon={Printer}
          label="Transport Modes"
          value={new Set(data.map((r) => r.transportMode)).size.toString()}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      <TabHeader
        title="Packing Report"
        subtitle="Packing details with size breakdown, carton tracking, and logistics"
        onExport={() => onExport(data, columns, "Packing_Report")}
      />

      <ReportTable
        columns={columns}
        data={formatted}
        loading={loading}
        totalsRow={{
          packingNo: "TOTAL",
          qty: totalQty.toLocaleString("en-IN"),
        }}
      />
    </div>
  );
}

/* =================================================================
   MAIN PAGE
   ================================================================= */

export default function ReportsPage() {
  /* ---- Filter state ---- */
  const [fromDate, setFromDate] = useState(getStartOfMonth());
  const [toDate, setToDate] = useState(getToday());
  const [activePeriod, setActivePeriod] = useState<PeriodShortcut>("month");
  const [warehouseId, setWarehouseId] = useState("");
  const [clientId, setClientId] = useState("");
  const [reportFormat, setReportFormat] = useState<ReportFormat>("summary");

  /* ---- Dropdown data ---- */
  const [warehouses, setWarehouses] = useState<DropdownItem[]>([]);
  const [clients, setClients] = useState<DropdownItem[]>([]);

  /* ---- Active tab and sub-view ---- */
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");
  const [salesView, setSalesView] = useState<SalesView>("day");
  const [salesSubView, setSalesSubView] = useState<SalesSubView>("register");

  /* ---- Report data ---- */
  const [loading, setLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  /* ---- Data state ---- */
  const [salesDetailedData, setSalesDetailedData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [productionData, setProductionData] = useState<any[]>([]);
  const [intentData, setIntentData] = useState<any[]>([]);
  const [consignmentData, setConsignmentData] = useState<any[]>([]);
  const [gstData, setGSTData] = useState<any[]>([]);
  const [valuationData, setValuationData] = useState<any[]>([]);
  const [invoiceData, setInvoiceData] = useState<any[]>([]);
  const [packingData, setPackingData] = useState<any[]>([]);

  /* ---- Fetch dropdown data ---- */
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [whRes, clRes] = await Promise.allSettled([
          api.get<ApiResponse<any>>("/api/warehouses", {
            params: { pageSize: 500 },
          }),
          api.get<ApiResponse<any>>("/api/clients", {
            params: { pageSize: 500 },
          }),
        ]);
        if (whRes.status === "fulfilled" && whRes.value.data.success) {
          const items =
            whRes.value.data.data?.items || whRes.value.data.data || [];
          setWarehouses(
            items.map((w: any) => ({
              id: w.warehouseId,
              name: w.warehouseName,
            }))
          );
        }
        if (clRes.status === "fulfilled" && clRes.value.data.success) {
          const items =
            clRes.value.data.data?.items || clRes.value.data.data || [];
          setClients(
            items.map((c: any) => ({
              id: c.clientId,
              name: c.clientName,
            }))
          );
        }
      } catch {
        /* silent */
      }
    };
    fetchDropdowns();
  }, []);

  /* ---- Period shortcut handler ---- */
  const handlePeriodShortcut = (period: PeriodShortcut) => {
    setActivePeriod(period);
    const today = getToday();
    switch (period) {
      case "today":
        setFromDate(today);
        setToDate(today);
        break;
      case "week":
        setFromDate(getStartOfWeek());
        setToDate(today);
        break;
      case "month":
        setFromDate(getStartOfMonth());
        setToDate(today);
        break;
      case "quarter":
        setFromDate(getStartOfQuarter());
        setToDate(today);
        break;
      case "year":
        setFromDate(getStartOfYear());
        setToDate(today);
        break;
      case "custom":
        break;
    }
  };

  /* ---- Generate report ---- */
  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setReportGenerated(false);

    try {
      const params = {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        warehouseId: warehouseId || undefined,
        clientId: clientId || undefined,
        format: reportFormat,
      };

      const [salesRes, inventoryRes, productionRes, gstRes, invoiceRes, packingRes] =
        await Promise.allSettled([
          api.get<ApiResponse<any>>("/api/reports/sales", { params }),
          api.get<ApiResponse<any>>("/api/reports/inventory", { params }),
          api.get<ApiResponse<any>>("/api/reports/production", { params }),
          api.get<ApiResponse<any>>("/api/reports/gst", { params }),
          api.get<ApiResponse<any>>("/api/reports/invoices", { params }),
          api.get<ApiResponse<any>>("/api/reports/packing", { params }),
        ]);

      // Sales
      if (
        salesRes.status === "fulfilled" &&
        salesRes.value.data.success &&
        (salesRes.value.data.data?.items || salesRes.value.data.data || []).length > 0
      ) {
        setSalesDetailedData(
          salesRes.value.data.data?.items || salesRes.value.data.data || []
        );
      } else {
        setSalesDetailedData(generateDetailedSalesRegister());
      }

      // Inventory
      if (
        inventoryRes.status === "fulfilled" &&
        inventoryRes.value.data.success &&
        (inventoryRes.value.data.data?.items || inventoryRes.value.data.data || []).length > 0
      ) {
        setInventoryData(
          inventoryRes.value.data.data?.items || inventoryRes.value.data.data || []
        );
      } else {
        setInventoryData(generateInventoryData());
      }

      // Production
      if (
        productionRes.status === "fulfilled" &&
        productionRes.value.data.success
      ) {
        setProductionData(
          productionRes.value.data.data?.items || productionRes.value.data.data || []
        );
      } else {
        setProductionData(generateProductionData());
      }

      // GST
      if (gstRes.status === "fulfilled" && gstRes.value.data.success) {
        setGSTData(
          gstRes.value.data.data?.items || gstRes.value.data.data || []
        );
      } else {
        setGSTData(generateGSTData());
      }

      // Invoices
      if (
        invoiceRes.status === "fulfilled" &&
        invoiceRes.value.data.success &&
        (invoiceRes.value.data.data?.items || invoiceRes.value.data.data || []).length > 0
      ) {
        setInvoiceData(
          invoiceRes.value.data.data?.items || invoiceRes.value.data.data || []
        );
      } else {
        setInvoiceData(generateInvoiceData());
      }

      // Packing
      if (
        packingRes.status === "fulfilled" &&
        packingRes.value.data.success &&
        (packingRes.value.data.data?.items || packingRes.value.data.data || []).length > 0
      ) {
        setPackingData(
          packingRes.value.data.data?.items || packingRes.value.data.data || []
        );
      } else {
        setPackingData(generatePackingData());
      }
    } catch {
      // All API calls failed, use mock data
      setSalesDetailedData(generateDetailedSalesRegister());
      setInventoryData(generateInventoryData());
      setProductionData(generateProductionData());
      setGSTData(generateGSTData());
      setInvoiceData(generateInvoiceData());
      setPackingData(generatePackingData());
    }

    // Always generate these from mock for now
    setIntentData(generateIntentData());
    setConsignmentData(generateConsignmentData());
    setValuationData(generateStockValuationData());

    setLoading(false);
    setReportGenerated(true);
  }, [fromDate, toDate, warehouseId, clientId, reportFormat]);

  /* ---- Clear filters ---- */
  const handleClearFilters = () => {
    setFromDate(getStartOfMonth());
    setToDate(getToday());
    setActivePeriod("month");
    setWarehouseId("");
    setClientId("");
    setReportFormat("summary");
    setReportGenerated(false);
  };

  /* ---- Export handler ---- */
  const handleExport = useCallback(
    (data: any[], columns: { key: string; header: string }[], name: string) => {
      exportToCSV(data, columns, name);
    },
    []
  );

  /* ---- Tabs config ---- */
  const tabs: { key: ReportTab; label: string; icon: React.ElementType }[] = [
    { key: "sales", label: "Sales", icon: TrendingUp },
    { key: "inventory", label: "Inventory", icon: Package },
    { key: "production", label: "Production", icon: Factory },
    { key: "intent", label: "Intent Format", icon: FileText },
    { key: "consignment", label: "Consignment", icon: Truck },
    { key: "gst", label: "GST", icon: ShieldCheck },
    { key: "valuation", label: "Stock Valuation", icon: Boxes },
    { key: "invoice", label: "Invoice Report", icon: Receipt },
    { key: "packing", label: "Packing Report", icon: Printer },
  ];

  const periodShortcuts: { key: PeriodShortcut; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "quarter", label: "This Quarter" },
    { key: "year", label: "This Year" },
    { key: "custom", label: "Custom" },
  ];

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold">Reports &amp; Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Generate and export transaction reports with flexible filters
        </p>
      </div>

      {/* ================================================================
          Filter Panel (sticky)
          ================================================================ */}
      <div className="bg-card border rounded-xl p-5 sticky top-0 z-20 shadow-sm">
        {/* Period shortcuts */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Calendar size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-1">
            Period:
          </span>
          <div className="flex gap-1 flex-wrap">
            {periodShortcuts.map((ps) => (
              <button
                key={ps.key}
                onClick={() => handlePeriodShortcut(ps.key)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                  activePeriod === ps.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {ps.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter fields */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* From Date */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setActivePeriod("custom");
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setActivePeriod("custom");
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Warehouse/Store */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Warehouse / Store
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Client */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Client
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Report Format */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Report Format
            </label>
            <select
              value={reportFormat}
              onChange={(e) =>
                setReportFormat(e.target.value as ReportFormat)
              }
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="summary">Summary</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-foreground" />
              ) : (
                <RefreshCw size={14} />
              )}
              Generate
            </button>
            <button
              onClick={handleClearFilters}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================
          Report Tabs
          ================================================================ */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {/* Tab bar */}
        <div className="border-b overflow-x-auto">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-5">
          {!reportGenerated ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BarChart3
                size={48}
                className="mb-4 text-muted-foreground/40"
              />
              <p className="text-base font-medium mb-1">
                No report generated yet
              </p>
              <p className="text-sm">
                Set your filters above and click{" "}
                <span className="font-medium text-foreground">Generate</span>{" "}
                to view the report.
              </p>
            </div>
          ) : (
            <>
              {/* ---- SALES TAB ---- */}
              {activeTab === "sales" && (
                <SalesTab
                  loading={loading}
                  detailedData={salesDetailedData}
                  salesSubView={salesSubView}
                  setSalesSubView={setSalesSubView}
                  salesView={salesView}
                  setSalesView={setSalesView}
                  onExport={handleExport}
                />
              )}

              {/* ---- INVENTORY TAB ---- */}
              {activeTab === "inventory" && (
                <InventoryTab
                  data={inventoryData}
                  loading={loading}
                  onExport={handleExport}
                />
              )}

              {/* ---- PRODUCTION TAB ---- */}
              {activeTab === "production" && (
                <ProductionTab
                  data={productionData}
                  loading={loading}
                  onExport={handleExport}
                />
              )}

              {/* ---- INTENT FORMAT TAB ---- */}
              {activeTab === "intent" && (
                <IntentTab
                  data={intentData}
                  loading={loading}
                  onExport={handleExport}
                />
              )}

              {/* ---- CONSIGNMENT TAB ---- */}
              {activeTab === "consignment" && (
                <ConsignmentTab
                  data={consignmentData}
                  loading={loading}
                  onExport={handleExport}
                />
              )}

              {/* ---- GST TAB ---- */}
              {activeTab === "gst" && (
                <GSTTab
                  data={gstData}
                  loading={loading}
                  onExport={handleExport}
                />
              )}

              {/* ---- STOCK VALUATION TAB ---- */}
              {activeTab === "valuation" && (
                <ValuationTab
                  data={valuationData}
                  loading={loading}
                  onExport={handleExport}
                />
              )}

              {/* ---- INVOICE REPORT TAB ---- */}
              {activeTab === "invoice" && (
                <InvoiceTab
                  data={invoiceData}
                  loading={loading}
                  onExport={handleExport}
                />
              )}

              {/* ---- PACKING REPORT TAB ---- */}
              {activeTab === "packing" && (
                <PackingTab
                  data={packingData}
                  loading={loading}
                  onExport={handleExport}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
