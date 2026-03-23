"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Printer,
  Eye,
  Download,
  ScanLine,
  ChevronLeft,
  X,
  Edit2,
  Search,
  Filter,
  ChevronRight,
  ShoppingCart,
  Package,
} from "lucide-react";

/* ================================================================
   TYPES
   ================================================================ */

interface Invoice {
  invoiceId: string;
  invoiceNo: string;
  invoiceDate: string;
  clientId: string;
  clientName: string;
  clientAddress?: string;
  clientState?: string;
  clientPincode?: string;
  clientGSTIN?: string;
  clientGSTStateCode?: string;
  contactPerson?: string;
  contactMobile?: string;
  deliveryAddress?: string;
  deliveryState?: string;
  deliveryPincode?: string;
  deliveryGSTIN?: string;
  deliveryGSTStateCode?: string;
  storeId: string;
  storeName: string;
  storeCode?: string;
  purchaseOrderNo?: string;
  purchaseOrderDate?: string;
  cartonBoxes: number;
  totalPairs: number;
  logisticPartner?: string;
  transportMode?: string;
  vehicleRegNo?: string;
  placeOfSupply?: string;
  isInterState?: boolean;
  companyState?: string;
  taxableAmount: number;
  totalDiscount: number;
  totalSGST: number;
  totalCGST: number;
  totalIGST: number;
  totalGST: number;
  grossTotal: number;
  roundOff: number;
  grandTotal: number;
  amountInWords?: string;
  status: string;
  lineItems?: InvoiceLineItem[];
  packingDetails?: PackingRow[];
  bankDetails?: BankDetails;
  termsAndConditions?: string;
  declaration?: string;
}

interface InvoiceLineItem {
  lineItemId?: string;
  slNo?: number;
  crtSerial: string;
  hsnCode: string;
  articleId: string;
  articleName: string;
  color: string;
  description: string;
  uom: string;
  sizeBreakdown: Record<string, number>;
  totalQty: number;
  mrpPerPair: number;
  marginPercent: number;
  marginValue: number;
  gstPayablePercent: number;
  gstPayableValue: number;
  billingExclGST: number;
  gstReimbursementPercent: number;
  gstReimbursementValue: number;
  billingInclGST: number;
  unitRate: number;
  taxableValue: number;
  sgstPercent: number;
  sgstAmount: number;
  cgstPercent: number;
  cgstAmount: number;
  igstPercent: number;
  igstAmount: number;
}

interface PackingRow {
  cartonNo: number;
  articleName: string;
  color: string;
  sizeBreakdown: Record<string, number>;
  totalPairs: number;
}

interface DropdownItem {
  id: string;
  name: string;
  parentId?: string;
  gstin?: string;
  gstStateCode?: string;
  address?: string;
  state?: string;
  pincode?: string;
  contact?: string;
  mobile?: string;
  code?: string;
}

interface BankDetails {
  accountName: string;
  bankName: string;
  branch: string;
  accountNo: string;
  ifsCode: string;
}

/* ================================================================
   CONSTANTS
   ================================================================ */

const SIZE_COLUMNS = [
  "39-05",
  "40-06",
  "41-07",
  "42-08",
  "43-09",
  "44-10",
  "45-11",
  "46-12",
] as const;

const TABS = ["Tax Invoice", "Packing Detail - Tax Invoice"] as const;
type TabType = (typeof TABS)[number];

const inputCls =
  "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

const inputSmCls =
  "w-full px-1.5 py-1 border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary";

const COMPANY_STATE = "UTTAR PRADESH";

const DEFAULT_BANK_DETAILS: BankDetails = {
  accountName: "SKH EXPORTS",
  bankName: "State Bank of India",
  branch: "Agra Main Branch",
  accountNo: "XXXXXXXXXXXX",
  ifsCode: "SBIN0000XXX",
};

const EMPTY_SIZE_BREAKDOWN: Record<string, number> = Object.fromEntries(
  SIZE_COLUMNS.map((s) => [s, 0])
);

/* ================================================================
   EL CURIO MARGIN FORMULA (CRITICAL)
   ================================================================ */

function calcElCurioLineItem(
  li: InvoiceLineItem,
  isInterState: boolean,
  companyState: string,
  clientState: string
): InvoiceLineItem {
  const mrp = li.mrpPerPair;
  const marginPercent = li.marginPercent;

  // Margin Value = MRP x Margin%
  const marginValue = mrp * (marginPercent / 100);

  // GST Payable % = IF(MRP <= 2625, 5%, 18%)
  const gstPayablePercent = mrp <= 2625 ? 5 : 18;

  // GST Payable Value = MRP x GST% / (GST% + 1)
  // Note: "GST% + 1" means the percentage converted, e.g., 5% => 5/100+1=1.05
  const gstPayableValue = (mrp * (gstPayablePercent / 100)) / (gstPayablePercent / 100 + 1);

  // Billing (Exclusive GST) = MRP - Margin Value - GST Payable Value
  const billingExclGST = mrp - marginValue - gstPayableValue;

  // GST Reimbursement % = IF(Billing Exclusive <= 2500, 5%, 18%)
  const gstReimbursementPercent = billingExclGST <= 2500 ? 5 : 18;

  // GST Reimbursement Value = Billing Exclusive x GST Reimbursement %
  const gstReimbursementValue = billingExclGST * (gstReimbursementPercent / 100);

  // Billing (Inclusive GST) = Billing Exclusive + GST Reimbursement Value
  const billingInclGST = billingExclGST + gstReimbursementValue;

  // Unit Rate = Billing Exclusive GST (the rate before GST for invoicing)
  const unitRate = billingExclGST;

  // Total qty from size breakdown
  const totalQty =
    Object.values(li.sizeBreakdown).reduce((sum, v) => sum + (v || 0), 0) ||
    li.totalQty;

  // Taxable Value = Unit Rate x Qty
  const taxableValue = unitRate * totalQty;

  // Determine intra/inter state
  const stateMatch =
    !isInterState &&
    companyState.toUpperCase() === (clientState || "").toUpperCase();
  const gstRate = gstReimbursementPercent;
  const halfRate = gstRate / 2;

  let sgstPercent = 0,
    sgstAmount = 0,
    cgstPercent = 0,
    cgstAmount = 0,
    igstPercent = 0,
    igstAmount = 0;

  if (isInterState || !stateMatch) {
    igstPercent = gstRate;
    igstAmount = taxableValue * (gstRate / 100);
  } else {
    sgstPercent = halfRate;
    sgstAmount = taxableValue * (halfRate / 100);
    cgstPercent = halfRate;
    cgstAmount = taxableValue * (halfRate / 100);
  }

  return {
    ...li,
    totalQty,
    marginValue: Math.round(marginValue * 100) / 100,
    gstPayablePercent,
    gstPayableValue: Math.round(gstPayableValue * 100) / 100,
    billingExclGST: Math.round(billingExclGST * 100) / 100,
    gstReimbursementPercent,
    gstReimbursementValue: Math.round(gstReimbursementValue * 100) / 100,
    billingInclGST: Math.round(billingInclGST * 100) / 100,
    unitRate: Math.round(unitRate * 100) / 100,
    taxableValue: Math.round(taxableValue * 100) / 100,
    sgstPercent,
    sgstAmount: Math.round(sgstAmount * 100) / 100,
    cgstPercent,
    cgstAmount: Math.round(cgstAmount * 100) / 100,
    igstPercent,
    igstAmount: Math.round(igstAmount * 100) / 100,
  };
}

function makeEmptyLineItem(): InvoiceLineItem {
  return {
    crtSerial: "",
    hsnCode: "",
    articleId: "",
    articleName: "",
    color: "",
    description: "",
    uom: "PAIR",
    sizeBreakdown: { ...EMPTY_SIZE_BREAKDOWN },
    totalQty: 0,
    mrpPerPair: 0,
    marginPercent: 0,
    marginValue: 0,
    gstPayablePercent: 5,
    gstPayableValue: 0,
    billingExclGST: 0,
    gstReimbursementPercent: 5,
    gstReimbursementValue: 0,
    billingInclGST: 0,
    unitRate: 0,
    taxableValue: 0,
    sgstPercent: 2.5,
    sgstAmount: 0,
    cgstPercent: 2.5,
    cgstAmount: 0,
    igstPercent: 0,
    igstAmount: 0,
  };
}

function makeEmptyPackingRow(): PackingRow {
  return {
    cartonNo: 1,
    articleName: "",
    color: "",
    sizeBreakdown: { ...EMPTY_SIZE_BREAKDOWN },
    totalPairs: 0,
  };
}

/* ================================================================
   NUMBER TO WORDS — Indian Format
   ================================================================ */

function numberToWords(num: number): string {
  if (num === 0) return "ZERO RUPEES ONLY";

  const ones = [
    "",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
  ];
  const tens = [
    "",
    "",
    "TWENTY",
    "THIRTY",
    "FORTY",
    "FIFTY",
    "SIXTY",
    "SEVENTY",
    "EIGHTY",
    "NINETY",
  ];

  function convert(n: number): string {
    if (n < 0) return "";
    if (n < 20) return ones[n];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000)
      return (
        ones[Math.floor(n / 100)] +
        " HUNDRED" +
        (n % 100 ? " AND " + convert(n % 100) : "")
      );
    if (n < 100000)
      return (
        convert(Math.floor(n / 1000)) +
        " THOUSAND" +
        (n % 1000 ? " " + convert(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        convert(Math.floor(n / 100000)) +
        " LAKHS" +
        (n % 100000 ? " " + convert(n % 100000) : "")
      );
    return (
      convert(Math.floor(n / 10000000)) +
      " CRORE" +
      (n % 10000000 ? " " + convert(n % 10000000) : "")
    );
  }

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);
  let result = convert(intPart) + " RUPEES";
  if (decPart > 0) result += " AND " + convert(decPart) + " PAISE";
  return result + " ONLY";
}

/* ================================================================
   GENERATE INVOICE NUMBER
   ================================================================ */

function generateInvoiceNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const fyStart = month >= 4 ? year : year - 1;
  const fyEnd = (fyStart + 1) % 100;
  const seq = Math.floor(Math.random() * 900) + 100;
  return `SKH/${seq}/${fyStart % 100}-${fyEnd.toString().padStart(2, "0")}`;
}

/* ================================================================
   PRINT VIEW COMPONENT
   ================================================================ */

function PrintInvoiceView({
  invoice,
  printTab,
  onClose,
}: {
  invoice: Invoice;
  printTab: TabType;
  onClose: () => void;
}) {
  const items = invoice.lineItems || [];
  const isInterState = invoice.isInterState || false;
  const isPacking = printTab === "Packing Detail - Tax Invoice";

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, li) => {
          acc.qty += li.totalQty;
          acc.taxableValue += li.taxableValue;
          acc.sgst += li.sgstAmount;
          acc.cgst += li.cgstAmount;
          acc.igst += li.igstAmount;
          SIZE_COLUMNS.forEach((s) => {
            acc.sizes[s] = (acc.sizes[s] || 0) + (li.sizeBreakdown[s] || 0);
          });
          return acc;
        },
        {
          qty: 0,
          taxableValue: 0,
          sgst: 0,
          cgst: 0,
          igst: 0,
          sizes: {} as Record<string, number>,
        }
      ),
    [items]
  );

  const grossTotal = totals.taxableValue + totals.sgst + totals.cgst + totals.igst;
  const roundOff = Math.round(grossTotal) - grossTotal;
  const grandTotal = Math.round(grossTotal);
  const bank = invoice.bankDetails || DEFAULT_BANK_DETAILS;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-[1100px] mx-4 max-h-[95vh] overflow-y-auto">
        {/* Screen-only controls */}
        <div className="flex items-center justify-between p-4 border-b print:hidden">
          <h2 className="text-lg font-semibold">Print Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              <Printer size={14} /> Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable content */}
        <div className="p-6 print-invoice-content" id="print-invoice">
          {/* Header Title */}
          <div className="text-center border-b-2 border-black pb-3 mb-4">
            <h1 className="text-lg font-bold tracking-wide uppercase">
              {isPacking
                ? "PACKING DETAIL - TAX INVOICE FORMAT"
                : "TAX INVOICE"}
            </h1>
          </div>

          {/* Company Info */}
          <div className="flex justify-between items-start mb-4 border border-black p-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-wider">
                EL CURIO
              </h2>
              <p className="text-xs text-gray-700 mt-0.5">
                Manufacturer &amp; Exporter of Leather Goods
              </p>
            </div>
            <div className="text-right text-xs leading-relaxed">
              <p className="font-bold text-sm">SKH EXPORTS</p>
              <p>Plot No. 123, Industrial Area</p>
              <p>Agra, Uttar Pradesh - 282007</p>
              <p>Phone: +91-562-XXXXXXX</p>
              <p>Email: info@elcurio.com</p>
              <p className="mt-1">
                <span className="font-semibold">GSTIN: </span>
                <span className="font-mono">09AXXXX1234X1Z5</span>
              </p>
            </div>
          </div>

          {/* Invoice Details Row */}
          <div className="grid grid-cols-5 border border-black text-xs mb-3">
            <div className="border-r border-black p-2">
              <span className="font-semibold block">Invoice No</span>
              <span className="font-mono">{invoice.invoiceNo}</span>
            </div>
            <div className="border-r border-black p-2">
              <span className="font-semibold block">Date</span>
              <span>{formatDate(invoice.invoiceDate)}</span>
            </div>
            <div className="border-r border-black p-2">
              <span className="font-semibold block">Purchase Order</span>
              <span>{invoice.purchaseOrderNo || "-"}</span>
              {invoice.purchaseOrderDate && (
                <span className="block text-[10px] text-gray-500">
                  Dt: {formatDate(invoice.purchaseOrderDate)}
                </span>
              )}
            </div>
            <div className="border-r border-black p-2">
              <span className="font-semibold block">T. Carton Boxes</span>
              <span>{invoice.cartonBoxes || 0}</span>
            </div>
            <div className="p-2">
              <span className="font-semibold block">Total Pairs</span>
              <span className="font-semibold">
                {invoice.totalPairs || totals.qty}
              </span>
            </div>
          </div>

          {/* Logistics Row */}
          <div className="grid grid-cols-3 border border-black text-xs mb-3">
            <div className="border-r border-black p-2">
              <span className="font-semibold block">Logistic</span>
              <span>{invoice.logisticPartner || "-"}</span>
            </div>
            <div className="border-r border-black p-2">
              <span className="font-semibold block">Mode of Transport</span>
              <span>{invoice.transportMode || "-"}</span>
              {invoice.vehicleRegNo && (
                <span className="block mt-0.5">
                  Vehicle Reg No: {invoice.vehicleRegNo}
                </span>
              )}
            </div>
            <div className="p-2">
              <span className="font-semibold block">Place of Supply</span>
              <span>{invoice.placeOfSupply || "-"}</span>
            </div>
          </div>

          {/* BILL TO / NAME / DELIVERY */}
          <div className="grid grid-cols-2 border border-black text-xs mb-3">
            <div className="border-r border-black p-3">
              <h3 className="font-bold text-sm mb-1 border-b border-black pb-1">
                BILL TO
              </h3>
              <p className="font-semibold">{invoice.clientName}</p>
              <p>{invoice.clientAddress || "-"}</p>
              <p>
                State: {invoice.clientState || "-"}, Pincode:{" "}
                {invoice.clientPincode || "-"}
              </p>
              <p>
                GSTIN:{" "}
                <span className="font-mono">
                  {invoice.clientGSTIN || "-"}
                </span>
              </p>
              <p>GST State Code: {invoice.clientGSTStateCode || "-"}</p>
            </div>
            <div className="p-3">
              <h3 className="font-bold text-sm mb-1 border-b border-black pb-1">
                NAME
              </h3>
              <p>Contact Person: {invoice.contactPerson || "-"}</p>
              <p>Mobile: {invoice.contactMobile || "-"}</p>
              <div className="mt-2 border-t border-black pt-1">
                <h3 className="font-bold text-sm mb-1">
                  DELIVERY ADDRESS / SHIPPING ADDRESS
                </h3>
                <p>{invoice.deliveryAddress || "-"}</p>
                <p>
                  State: {invoice.deliveryState || "-"}, Pincode:{" "}
                  {invoice.deliveryPincode || "-"}
                </p>
                <p>
                  GSTIN:{" "}
                  <span className="font-mono">
                    {invoice.deliveryGSTIN || "-"}
                  </span>
                </p>
                <p>
                  GST State Code: {invoice.deliveryGSTStateCode || "-"}
                </p>
              </div>
              <div className="mt-2 border-t border-black pt-1">
                <h3 className="font-bold text-sm">BRANCH</h3>
                <p>{invoice.storeCode || invoice.storeName}</p>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-black mb-3 overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th
                    className="border border-black px-1 py-1.5 text-center font-semibold"
                    rowSpan={2}
                  >
                    SL.No
                  </th>
                  <th
                    className="border border-black px-1 py-1.5 text-center font-semibold"
                    rowSpan={2}
                  >
                    CRT SERIAL
                  </th>
                  <th
                    className="border border-black px-1 py-1.5 text-center font-semibold"
                    rowSpan={2}
                  >
                    HSN Code
                  </th>
                  <th
                    className="border border-black px-1 py-1.5 text-center font-semibold min-w-[120px]"
                    rowSpan={2}
                  >
                    Description of Goods
                  </th>
                  <th
                    className="border border-black px-1 py-1.5 text-center font-semibold"
                    rowSpan={2}
                  >
                    Qty
                  </th>
                  <th
                    className="border border-black px-1 py-1.5 text-center font-semibold"
                    rowSpan={2}
                  >
                    UOM
                  </th>
                  <th
                    className="border border-black px-1 py-1.5 text-center font-semibold"
                    colSpan={8}
                  >
                    Size Breakdown
                  </th>
                  <th
                    className="border border-black px-1 py-1.5 text-center font-semibold"
                    rowSpan={2}
                  >
                    MRP PER PAIR
                  </th>
                  <th
                    className="border border-black px-1 py-1.5 text-center font-semibold"
                    rowSpan={2}
                  >
                    Unit Rate
                  </th>
                  <th
                    className="border border-black px-1 py-1.5 text-center font-semibold"
                    rowSpan={2}
                  >
                    Taxable Value
                  </th>
                  {isInterState ? (
                    <th
                      className="border border-black px-1 py-1.5 text-center font-semibold"
                      rowSpan={2}
                    >
                      IGST %
                    </th>
                  ) : (
                    <>
                      <th
                        className="border border-black px-1 py-1.5 text-center font-semibold"
                        rowSpan={2}
                      >
                        SGST %
                      </th>
                      <th
                        className="border border-black px-1 py-1.5 text-center font-semibold"
                        rowSpan={2}
                      >
                        CGST %
                      </th>
                    </>
                  )}
                </tr>
                <tr className="bg-gray-50">
                  {SIZE_COLUMNS.map((s) => (
                    <th
                      key={s}
                      className="border border-black px-1 py-1 text-center font-medium text-[9px]"
                    >
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((li, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border border-black px-1 py-1 text-center">
                      {li.slNo || idx + 1}
                    </td>
                    <td className="border border-black px-1 py-1 text-center font-mono">
                      {li.crtSerial || "-"}
                    </td>
                    <td className="border border-black px-1 py-1 text-center font-mono">
                      {li.hsnCode || "-"}
                    </td>
                    <td className="border border-black px-1 py-1">
                      {li.description ||
                        `${li.articleName}${li.color ? " - " + li.color : ""}`}
                    </td>
                    <td className="border border-black px-1 py-1 text-center font-semibold">
                      {li.totalQty}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {li.uom}
                    </td>
                    {SIZE_COLUMNS.map((s) => (
                      <td
                        key={s}
                        className="border border-black px-1 py-1 text-center"
                      >
                        {li.sizeBreakdown[s] || "-"}
                      </td>
                    ))}
                    <td className="border border-black px-1 py-1 text-right">
                      {formatCurrency(li.mrpPerPair)}
                    </td>
                    <td className="border border-black px-1 py-1 text-right">
                      {formatCurrency(li.unitRate)}
                    </td>
                    <td className="border border-black px-1 py-1 text-right">
                      {formatCurrency(li.taxableValue)}
                    </td>
                    {isInterState ? (
                      <td className="border border-black px-1 py-1 text-center">
                        {li.igstPercent}%
                      </td>
                    ) : (
                      <>
                        <td className="border border-black px-1 py-1 text-center">
                          {li.sgstPercent}%
                        </td>
                        <td className="border border-black px-1 py-1 text-center">
                          {li.cgstPercent}%
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {/* GRAND TOTAL Row */}
                <tr className="bg-gray-100 font-bold">
                  <td
                    className="border border-black px-1 py-2 text-center"
                    colSpan={4}
                  >
                    GRAND TOTAL
                  </td>
                  <td className="border border-black px-1 py-2 text-center">
                    {totals.qty}
                  </td>
                  <td className="border border-black px-1 py-2"></td>
                  {SIZE_COLUMNS.map((s) => (
                    <td
                      key={s}
                      className="border border-black px-1 py-2 text-center"
                    >
                      {totals.sizes[s] || "-"}
                    </td>
                  ))}
                  <td className="border border-black px-1 py-2"></td>
                  <td className="border border-black px-1 py-2"></td>
                  <td className="border border-black px-1 py-2 text-right">
                    {formatCurrency(totals.taxableValue)}
                  </td>
                  {isInterState ? (
                    <td className="border border-black px-1 py-2 text-right">
                      {formatCurrency(totals.igst)}
                    </td>
                  ) : (
                    <>
                      <td className="border border-black px-1 py-2 text-right">
                        {formatCurrency(totals.sgst)}
                      </td>
                      <td className="border border-black px-1 py-2 text-right">
                        {formatCurrency(totals.cgst)}
                      </td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="border border-black p-3 mb-3 text-xs">
            <span className="font-semibold">AMOUNT IN WORDS: </span>
            <span className="italic">{numberToWords(grandTotal)}</span>
          </div>

          {/* Bank Details & Tax Breakdown */}
          <div className="grid grid-cols-2 border border-black text-xs mb-3">
            <div className="border-r border-black p-3">
              <h3 className="font-bold text-sm mb-2 border-b border-black pb-1">
                BANK DETAILS
              </h3>
              <table className="text-xs w-full">
                <tbody>
                  <tr>
                    <td className="py-0.5 font-semibold pr-3 w-24">
                      A/C Name
                    </td>
                    <td>{bank.accountName}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold pr-3">Bank Name</td>
                    <td>{bank.bankName}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold pr-3">Branch</td>
                    <td>{bank.branch}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold pr-3">A/C No</td>
                    <td className="font-mono">{bank.accountNo}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold pr-3">IFS Code</td>
                    <td className="font-mono">{bank.ifsCode}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-3">
              <h3 className="font-bold text-sm mb-2 border-b border-black pb-1">
                TAX DESCRIPTION
              </h3>
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-1 font-semibold">
                      Description
                    </th>
                    <th className="text-right py-1 font-semibold">Rate</th>
                    <th className="text-right py-1 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-0.5">Taxable Value</td>
                    <td className="text-right">-</td>
                    <td className="text-right font-mono">
                      {formatCurrency(totals.taxableValue)}
                    </td>
                  </tr>
                  {isInterState ? (
                    <tr>
                      <td className="py-0.5">IGST</td>
                      <td className="text-right">
                        {items[0]?.igstPercent || 0}%
                      </td>
                      <td className="text-right font-mono">
                        {formatCurrency(totals.igst)}
                      </td>
                    </tr>
                  ) : (
                    <>
                      <tr>
                        <td className="py-0.5">SGST</td>
                        <td className="text-right">
                          {items[0]?.sgstPercent || 0}%
                        </td>
                        <td className="text-right font-mono">
                          {formatCurrency(totals.sgst)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5">CGST</td>
                        <td className="text-right">
                          {items[0]?.cgstPercent || 0}%
                        </td>
                        <td className="text-right font-mono">
                          {formatCurrency(totals.cgst)}
                        </td>
                      </tr>
                    </>
                  )}
                  <tr className="border-t border-black font-bold">
                    <td className="py-1">Total GST</td>
                    <td className="text-right">-</td>
                    <td className="text-right font-mono">
                      {formatCurrency(
                        totals.sgst + totals.cgst + totals.igst
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-3 border-t border-black pt-2 space-y-0.5">
                <div className="flex justify-between">
                  <span>GROSS TOTAL</span>
                  <span className="font-mono">
                    {formatCurrency(grossTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>TOTAL DISCOUNT</span>
                  <span className="font-mono">
                    {formatCurrency(invoice.totalDiscount || 0)}
                  </span>
                </div>
                {isInterState ? (
                  <div className="flex justify-between">
                    <span>TOTAL IGST</span>
                    <span className="font-mono">
                      {formatCurrency(totals.igst)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>TOTAL SGST</span>
                      <span className="font-mono">
                        {formatCurrency(totals.sgst)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>TOTAL CGST</span>
                      <span className="font-mono">
                        {formatCurrency(totals.cgst)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span>TOTAL</span>
                  <span className="font-mono">
                    {formatCurrency(grossTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ROUND OFF</span>
                  <span className="font-mono">
                    {roundOff >= 0 ? "+" : ""}
                    {roundOff.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-black pt-1">
                  <span>GRAND TOTAL</span>
                  <span className="font-mono">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Packing Details (only in Packing tab print) */}
          {isPacking && invoice.packingDetails && invoice.packingDetails.length > 0 && (
            <div className="border border-black mb-3">
              <div className="bg-gray-100 p-2 border-b border-black">
                <h3 className="font-bold text-sm text-center">
                  CARTON-WISE PACKING DETAILS
                </h3>
              </div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-black px-1 py-1 text-center font-semibold">
                      Carton No
                    </th>
                    <th className="border border-black px-1 py-1 text-center font-semibold">
                      Article
                    </th>
                    <th className="border border-black px-1 py-1 text-center font-semibold">
                      Colour
                    </th>
                    {SIZE_COLUMNS.map((s) => (
                      <th
                        key={s}
                        className="border border-black px-1 py-1 text-center font-semibold text-[9px]"
                      >
                        {s}
                      </th>
                    ))}
                    <th className="border border-black px-1 py-1 text-center font-semibold">
                      Pairs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.packingDetails.map((row, idx) => (
                    <tr key={idx}>
                      <td className="border border-black px-1 py-1 text-center">
                        {row.cartonNo}
                      </td>
                      <td className="border border-black px-1 py-1">
                        {row.articleName}
                      </td>
                      <td className="border border-black px-1 py-1">
                        {row.color}
                      </td>
                      {SIZE_COLUMNS.map((s) => (
                        <td
                          key={s}
                          className="border border-black px-1 py-1 text-center"
                        >
                          {row.sizeBreakdown[s] || "-"}
                        </td>
                      ))}
                      <td className="border border-black px-1 py-1 text-center font-semibold">
                        {row.totalPairs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Terms and Conditions */}
          <div className="border border-black p-3 mb-3 text-xs">
            <h3 className="font-bold text-sm mb-1">TERMS AND CONDITIONS</h3>
            <ol className="list-decimal list-inside space-y-0.5 text-gray-700">
              <li>
                Goods once sold will not be taken back or exchanged.
              </li>
              <li>
                Interest @ 18% p.a. will be charged if payment is not made
                within due date.
              </li>
              <li>
                All disputes are subject to Agra jurisdiction only.
              </li>
              <li>E. &amp; O.E.</li>
            </ol>
          </div>

          {/* Declaration */}
          <div className="border border-black p-3 mb-3 text-xs">
            <h3 className="font-bold text-sm mb-1">DECLARATION</h3>
            <p className="text-gray-700">
              We declare that this invoice shows the actual price of the goods
              described and that all particulars are true and correct.
            </p>
          </div>

          {/* Signature */}
          <div className="flex justify-between items-end border border-black p-4">
            <div className="text-xs">
              <p className="text-gray-500">Receiver&apos;s Signature</p>
              <div className="w-48 border-b border-gray-400 mt-8"></div>
            </div>
            <div className="text-xs text-right">
              <p className="font-semibold">For EL CURIO / SKH EXPORTS</p>
              <div className="w-48 border-b border-gray-400 mt-8 ml-auto"></div>
              <p className="mt-1 font-semibold">Authorised Signatory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-invoice-content,
          .print-invoice-content * { visibility: visible !important; }
          .print-invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 8mm;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 5mm; }
        }
      `}</style>
    </div>
  );
}

/* ================================================================
   VIEW INVOICE COMPONENT
   ================================================================ */

function ViewInvoiceModal({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const items = invoice.lineItems || [];
  const isInterState = invoice.isInterState || false;

  const totals = items.reduce(
    (acc, li) => {
      acc.qty += li.totalQty;
      acc.taxableValue += li.taxableValue;
      acc.sgst += li.sgstAmount;
      acc.cgst += li.cgstAmount;
      acc.igst += li.igstAmount;
      return acc;
    },
    { qty: 0, taxableValue: 0, sgst: 0, cgst: 0, igst: 0 }
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Invoice ${invoice.invoiceNo}`}
      subtitle="Tax Invoice & Packing List"
      size="xl"
    >
      <div className="space-y-4">
        {/* Header info grid */}
        <div className="grid grid-cols-4 gap-4 bg-muted/30 rounded-lg p-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground block">Date</span>
            <span className="font-medium">
              {formatDate(invoice.invoiceDate)}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Client</span>
            <span className="font-medium">{invoice.clientName}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Store</span>
            <span className="font-medium">{invoice.storeName}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Status</span>
            <StatusBadge status={invoice.status} />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground block">PO No</span>
            <span>{invoice.purchaseOrderNo || "-"}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">
              Carton Boxes
            </span>
            <span>{invoice.cartonBoxes}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">
              Total Pairs
            </span>
            <span className="font-semibold">{invoice.totalPairs}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">
              Logistic
            </span>
            <span>{invoice.logisticPartner || "-"}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">
              Transport
            </span>
            <span>
              {invoice.transportMode || "-"}{" "}
              {invoice.vehicleRegNo ? `(${invoice.vehicleRegNo})` : ""}
            </span>
          </div>
        </div>

        {/* Line items */}
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                  #
                </th>
                <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                  Article / Color
                </th>
                <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                  HSN
                </th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground">
                  Qty
                </th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground">
                  MRP
                </th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground">
                  Margin%
                </th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground">
                  Unit Rate
                </th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground">
                  Taxable
                </th>
                <th className="px-2 py-2 text-right font-medium text-muted-foreground">
                  GST
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((li, idx) => (
                <tr key={idx} className="border-b">
                  <td className="px-2 py-1.5">{idx + 1}</td>
                  <td className="px-2 py-1.5 font-medium">
                    {li.articleName}
                    {li.color ? ` - ${li.color}` : ""}
                  </td>
                  <td className="px-2 py-1.5 font-mono">
                    {li.hsnCode || "-"}
                  </td>
                  <td className="px-2 py-1.5 text-right">{li.totalQty}</td>
                  <td className="px-2 py-1.5 text-right">
                    {formatCurrency(li.mrpPerPair)}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {li.marginPercent}%
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {formatCurrency(li.unitRate)}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {formatCurrency(li.taxableValue)}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {formatCurrency(
                      li.sgstAmount + li.cgstAmount + li.igstAmount
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-1 min-w-[300px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxable Amount:</span>
              <span>{formatCurrency(totals.taxableValue)}</span>
            </div>
            {isInterState ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IGST:</span>
                <span>{formatCurrency(totals.igst)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGST:</span>
                  <span>{formatCurrency(totals.sgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGST:</span>
                  <span>{formatCurrency(totals.cgst)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Grand Total:</span>
              <span>
                {formatCurrency(
                  totals.taxableValue +
                    totals.sgst +
                    totals.cgst +
                    totals.igst
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================
   INVOICE ENTRY FULL-SCREEN COMPONENT
   ================================================================ */

function InvoiceEntryScreen({
  editingInvoice,
  clients,
  onClose,
  onSaved,
}: {
  editingInvoice: Invoice | null;
  clients: DropdownItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Section 1 - Header
  const [invoiceNo, setInvoiceNo] = useState(
    editingInvoice?.invoiceNo || generateInvoiceNo()
  );
  const [invoiceDate, setInvoiceDate] = useState(
    editingInvoice?.invoiceDate
      ? new Date(editingInvoice.invoiceDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [purchaseOrderNo, setPurchaseOrderNo] = useState(
    editingInvoice?.purchaseOrderNo || ""
  );
  const [purchaseOrderDate, setPurchaseOrderDate] = useState(
    editingInvoice?.purchaseOrderDate
      ? new Date(editingInvoice.purchaseOrderDate).toISOString().split("T")[0]
      : ""
  );
  const [cartonBoxes, setCartonBoxes] = useState(
    editingInvoice?.cartonBoxes || 0
  );
  const [logisticPartner, setLogisticPartner] = useState(
    editingInvoice?.logisticPartner || ""
  );
  const [transportMode, setTransportMode] = useState(
    editingInvoice?.transportMode || "Surface"
  );
  const [vehicleRegNo, setVehicleRegNo] = useState(
    editingInvoice?.vehicleRegNo || ""
  );
  const [placeOfSupply, setPlaceOfSupply] = useState(
    editingInvoice?.placeOfSupply || ""
  );

  // Section 2 - Bill To / Ship To
  const [clientId, setClientId] = useState(editingInvoice?.clientId || "");
  const [clientAddress, setClientAddress] = useState(
    editingInvoice?.clientAddress || ""
  );
  const [clientState, setClientState] = useState(
    editingInvoice?.clientState || ""
  );
  const [clientPincode, setClientPincode] = useState(
    editingInvoice?.clientPincode || ""
  );
  const [clientGSTIN, setClientGSTIN] = useState(
    editingInvoice?.clientGSTIN || ""
  );
  const [clientGSTStateCode, setClientGSTStateCode] = useState(
    editingInvoice?.clientGSTStateCode || ""
  );
  const [contactPerson, setContactPerson] = useState(
    editingInvoice?.contactPerson || ""
  );
  const [contactMobile, setContactMobile] = useState(
    editingInvoice?.contactMobile || ""
  );
  const [deliveryAddress, setDeliveryAddress] = useState(
    editingInvoice?.deliveryAddress || ""
  );
  const [deliveryState, setDeliveryState] = useState(
    editingInvoice?.deliveryState || ""
  );
  const [deliveryPincode, setDeliveryPincode] = useState(
    editingInvoice?.deliveryPincode || ""
  );
  const [deliveryGSTIN, setDeliveryGSTIN] = useState(
    editingInvoice?.deliveryGSTIN || ""
  );
  const [deliveryGSTStateCode, setDeliveryGSTStateCode] = useState(
    editingInvoice?.deliveryGSTStateCode || ""
  );
  const [storeId, setStoreId] = useState(editingInvoice?.storeId || "");
  const [stores, setStores] = useState<DropdownItem[]>([]);
  const [isInterState, setIsInterState] = useState(
    editingInvoice?.isInterState || false
  );

  // Section 3 - Line Items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(
    editingInvoice?.lineItems && editingInvoice.lineItems.length > 0
      ? editingInvoice.lineItems
      : [makeEmptyLineItem()]
  );

  // Section 5 - Packing Details
  const [packingDetails, setPackingDetails] = useState<PackingRow[]>(
    editingInvoice?.packingDetails && editingInvoice.packingDetails.length > 0
      ? editingInvoice.packingDetails
      : [makeEmptyPackingRow()]
  );

  // Entry tab within the form
  const [entryTab, setEntryTab] = useState<"invoice" | "packing">("invoice");

  // Barcode input
  const [barcodeInput, setBarcodeInput] = useState("");

  // Saving state
  const [saving, setSaving] = useState(false);

  // Invoice Category (customer-order vs stock)
  const [invoiceCategory, setInvoiceCategory] = useState<"customer-order" | "stock">("stock");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);

  // Warehouses for stock lookup
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Stock availability per line item: lineIndex -> { sizeKey -> availableQty }
  const [lineStockMap, setLineStockMap] = useState<Record<number, Record<string, number>>>({});

  /* ---------- FETCH WAREHOUSES ---------- */

  useEffect(() => {
    api
      .get<ApiResponse<any>>("/api/warehouses?pageSize=100")
      .then(({ data }) => {
        if (data.success) {
          const items = data.data?.items || data.data || [];
          setWarehouses(items);
        }
      })
      .catch(() => {});
  }, []);

  /* ---------- FETCH CUSTOMER ORDERS ---------- */

  useEffect(() => {
    if (invoiceCategory !== "customer-order" || !clientId) {
      setCustomerOrders([]);
      setSelectedOrderId("");
      return;
    }
    api
      .get<ApiResponse<any>>("/api/orders", {
        params: { clientId, pageSize: 100 },
      })
      .then(({ data }) => {
        if (data.success) {
          const items = data.data?.items || data.data || [];
          setCustomerOrders(items);
        }
      })
      .catch(() => {
        setCustomerOrders([]);
      });
  }, [invoiceCategory, clientId]);

  /* ---------- HANDLE ORDER SELECTION ---------- */

  const handleOrderSelect = async (orderId: string) => {
    setSelectedOrderId(orderId);
    if (!orderId) return;
    try {
      const { data } = await api.get<ApiResponse<any>>(`/api/orders/${orderId}`);
      if (data.success && data.data) {
        const order = data.data;
        const orderItems = order.lineItems || order.items || [];
        if (orderItems.length > 0) {
          const newLineItems = orderItems.map((item: any) =>
            recalcLine({
              ...makeEmptyLineItem(),
              articleId: item.articleId || "",
              articleName: item.articleName || item.styleName || "",
              color: item.color || "",
              hsnCode: item.hsnCode || "",
              description:
                item.description ||
                `${item.articleName || ""}${item.color ? " - " + item.color : ""}`,
              mrpPerPair: item.mrp || item.mrpPerPair || 0,
              marginPercent: item.marginPercent || 0,
              sizeBreakdown: item.sizeBreakdown || { ...EMPTY_SIZE_BREAKDOWN },
              totalQty: item.totalQty || item.qty || 0,
            })
          );
          setLineItems(newLineItems);
        }
      }
    } catch {
      alert("Failed to load order details.");
    }
  };

  /* ---------- FETCH ARTICLE STOCK ---------- */

  const fetchArticleStock = async (
    articleId: string,
    warehouseId?: string
  ): Promise<Record<string, number>> => {
    try {
      const whId = warehouseId || warehouses[0]?.warehouseId || warehouses[0]?.id;
      if (!whId) return {};
      const { data } = await api.get<ApiResponse<any>>(
        `/api/stock/warehouse/${whId}/article/${articleId}`
      );
      if (data.success && data.data?.sizeStock) {
        const stockMap: Record<string, number> = {};
        data.data.sizeStock.forEach((s: any) => {
          if (s.closingStock > 0) {
            stockMap[String(s.euroSize)] = s.closingStock;
          }
        });
        return stockMap;
      }
    } catch {}
    return {};
  };

  /* ---------- FETCH STORES ---------- */

  const fetchStores = useCallback(async (cId: string) => {
    if (!cId) {
      setStores([]);
      return;
    }
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/stores", {
        params: { clientId: cId, pageSize: 500 },
      });
      if (data.success) {
        const items = data.data?.items || data.data || [];
        setStores(
          items.map((s: any) => ({
            id: s.storeId,
            name: s.storeName,
            parentId: s.clientId,
            code: s.storeCode,
            address: s.address,
            state: s.state,
            pincode: s.pincode,
            gstin: s.gstin,
            gstStateCode: s.gstStateCode,
          }))
        );
      }
    } catch {
      setStores([]);
    }
  }, []);

  useEffect(() => {
    if (clientId) fetchStores(clientId);
  }, [clientId, fetchStores]);

  /* ---------- AUTO-FILL FROM CLIENT ---------- */

  const handleClientChange = (cId: string) => {
    setClientId(cId);
    setStoreId("");
    const client = clients.find((c) => c.id === cId);
    if (client) {
      setClientAddress(client.address || "");
      setClientState(client.state || "");
      setClientPincode(client.pincode || "");
      setClientGSTIN(client.gstin || "");
      setClientGSTStateCode(client.gstStateCode || "");
      setContactPerson(client.name || "");
      setContactMobile(client.mobile || "");
      // Determine inter-state
      const cState = (client.state || "").toUpperCase();
      const inter = cState !== "" && cState !== COMPANY_STATE.toUpperCase();
      setIsInterState(inter);
    }
  };

  const handleStoreChange = (sId: string) => {
    setStoreId(sId);
    const store = stores.find((s) => s.id === sId);
    if (store) {
      setDeliveryAddress(store.address || "");
      setDeliveryState(store.state || "");
      setDeliveryPincode(store.pincode || "");
      setDeliveryGSTIN(store.gstin || "");
      setDeliveryGSTStateCode(store.gstStateCode || "");
    }
  };

  /* ---------- LINE ITEM HELPERS ---------- */

  const recalcLine = useCallback(
    (li: InvoiceLineItem): InvoiceLineItem => {
      return calcElCurioLineItem(
        li,
        isInterState,
        COMPANY_STATE,
        clientState
      );
    },
    [isInterState, clientState]
  );

  const updateLineItem = (
    idx: number,
    updates: Partial<InvoiceLineItem>
  ) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[idx] = recalcLine({ ...next[idx], ...updates });
      return next;
    });
    // If articleId changed, fetch stock availability for the new article
    if (updates.articleId && updates.articleId !== lineItems[idx]?.articleId) {
      fetchArticleStock(updates.articleId).then((stockMap) => {
        setLineStockMap((prev) => ({ ...prev, [idx]: stockMap }));
      });
    }
  };

  const updateLineItemSize = (
    idx: number,
    sizeKey: string,
    value: number
  ) => {
    setLineItems((prev) => {
      const next = [...prev];
      const newBreakdown = { ...next[idx].sizeBreakdown, [sizeKey]: value };
      const totalQty = Object.values(newBreakdown).reduce(
        (sum, v) => sum + (v || 0),
        0
      );
      next[idx] = recalcLine({
        ...next[idx],
        sizeBreakdown: newBreakdown,
        totalQty,
      });
      return next;
    });
  };

  const addLineItem = () =>
    setLineItems((prev) => [...prev, makeEmptyLineItem()]);

  const removeLineItem = (idx: number) =>
    setLineItems((prev) => prev.filter((_, i) => i !== idx));

  // Recalc all lines when inter-state changes
  useEffect(() => {
    setLineItems((prev) =>
      prev.map((li) =>
        calcElCurioLineItem(li, isInterState, COMPANY_STATE, clientState)
      )
    );
  }, [isInterState, clientState]);

  /* ---------- PACKING HELPERS ---------- */

  const updatePackingRow = (
    idx: number,
    updates: Partial<PackingRow>
  ) => {
    setPackingDetails((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...updates };
      // Recalc total pairs
      next[idx].totalPairs = Object.values(next[idx].sizeBreakdown).reduce(
        (sum, v) => sum + (v || 0),
        0
      );
      return next;
    });
  };

  const updatePackingSize = (
    idx: number,
    sizeKey: string,
    value: number
  ) => {
    setPackingDetails((prev) => {
      const next = [...prev];
      const newBreakdown = { ...next[idx].sizeBreakdown, [sizeKey]: value };
      const totalPairs = Object.values(newBreakdown).reduce(
        (sum, v) => sum + (v || 0),
        0
      );
      next[idx] = { ...next[idx], sizeBreakdown: newBreakdown, totalPairs };
      return next;
    });
  };

  const addPackingRow = () => {
    const maxCarton =
      packingDetails.length > 0
        ? Math.max(...packingDetails.map((r) => r.cartonNo))
        : 0;
    setPackingDetails((prev) => [
      ...prev,
      { ...makeEmptyPackingRow(), cartonNo: maxCarton + 1 },
    ]);
  };

  const removePackingRow = (idx: number) =>
    setPackingDetails((prev) => prev.filter((_, i) => i !== idx));

  /* ---------- BARCODE SCAN ---------- */

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim()) return;
    try {
      const { data } = await api.get<ApiResponse<any>>(
        `/api/articles/barcode/${barcode.trim()}`
      );
      if (data.success && data.data) {
        const article = data.data;
        const newItem = recalcLine({
          ...makeEmptyLineItem(),
          articleId: article.articleId || "",
          articleName: article.articleName || article.styleName || "",
          color: article.color || "",
          hsnCode: article.hsnCode || "",
          description:
            article.description ||
            `${article.articleName || ""}${article.color ? " - " + article.color : ""}`,
          mrpPerPair: article.mrp || 0,
          marginPercent: article.marginPercent || 0,
          sizeBreakdown: {
            ...EMPTY_SIZE_BREAKDOWN,
            ...(article.size
              ? { [article.size]: 1 }
              : {}),
          },
          totalQty: 1,
        });
        setLineItems((prev) => {
          const hasEmpty =
            prev.length === 1 && !prev[0].articleId;
          return hasEmpty ? [newItem] : [...prev, newItem];
        });
      } else {
        alert(`Article not found for barcode: ${barcode}`);
      }
    } catch {
      alert(`Failed to look up barcode: ${barcode}`);
    }
    setBarcodeInput("");
    barcodeRef.current?.focus();
  };

  /* ---------- COMPUTED TOTALS ---------- */

  const totals = useMemo(() => {
    return lineItems.reduce(
      (acc, li) => {
        acc.totalPairs += li.totalQty;
        acc.taxable += li.taxableValue;
        acc.sgst += li.sgstAmount;
        acc.cgst += li.cgstAmount;
        acc.igst += li.igstAmount;
        SIZE_COLUMNS.forEach((s) => {
          acc.sizes[s] =
            (acc.sizes[s] || 0) + (li.sizeBreakdown[s] || 0);
        });
        return acc;
      },
      {
        totalPairs: 0,
        taxable: 0,
        sgst: 0,
        cgst: 0,
        igst: 0,
        sizes: {} as Record<string, number>,
      }
    );
  }, [lineItems]);

  const grossTotal = totals.taxable + totals.sgst + totals.cgst + totals.igst;
  const roundOff = Math.round(grossTotal) - grossTotal;
  const grandTotal = Math.round(grossTotal);

  /* ---------- SAVE ---------- */

  const handleSave = async () => {
    if (!clientId) {
      alert("Please select a client.");
      return;
    }
    if (!storeId) {
      alert("Please select a store / branch.");
      return;
    }
    const validLines = lineItems.filter(
      (li) => li.articleId && li.totalQty > 0
    );
    if (validLines.length === 0) {
      alert("Add at least one line item with an article and quantity.");
      return;
    }

    setSaving(true);
    try {
      const clientObj = clients.find((c) => c.id === clientId);
      const storeObj = stores.find((s) => s.id === storeId);

      const body = {
        invoiceNo,
        invoiceDate,
        invoiceCategory,
        selectedOrderId: invoiceCategory === "customer-order" ? selectedOrderId : undefined,
        clientId,
        clientName: clientObj?.name || "",
        clientAddress,
        clientState,
        clientPincode,
        clientGSTIN,
        clientGSTStateCode,
        contactPerson,
        contactMobile,
        deliveryAddress,
        deliveryState,
        deliveryPincode,
        deliveryGSTIN,
        deliveryGSTStateCode,
        storeId,
        storeName: storeObj?.name || "",
        storeCode: storeObj?.code || "",
        purchaseOrderNo: purchaseOrderNo || undefined,
        purchaseOrderDate: purchaseOrderDate || undefined,
        cartonBoxes,
        totalPairs: totals.totalPairs,
        logisticPartner,
        transportMode,
        vehicleRegNo,
        placeOfSupply,
        isInterState,
        companyState: COMPANY_STATE,
        taxableAmount: totals.taxable,
        totalDiscount: 0,
        totalSGST: totals.sgst,
        totalCGST: totals.cgst,
        totalIGST: totals.igst,
        totalGST: totals.sgst + totals.cgst + totals.igst,
        grossTotal,
        roundOff: Math.round(roundOff * 100) / 100,
        grandTotal,
        amountInWords: numberToWords(grandTotal),
        lineItems: validLines,
        packingDetails: packingDetails.filter((p) => p.totalPairs > 0),
      };

      if (editingInvoice) {
        await api.put(
          `/api/invoices/${editingInvoice.invoiceId}`,
          body
        );
      } else {
        await api.post("/api/invoices", body);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- RENDER ---------- */

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-semibold">
              {editingInvoice ? "Edit Invoice" : "New Invoice"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {invoiceNo} &mdash; Tax Invoice &amp; Packing List
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingInvoice
                ? "Update Invoice"
                : "Create Invoice"}
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* ==================== INVOICE CATEGORY SELECTOR ==================== */}
        <div className="border rounded-xl p-5 bg-card shadow-sm">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Invoice Category
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <button
              type="button"
              onClick={() => setInvoiceCategory("customer-order")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                invoiceCategory === "customer-order"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingCart size={24} className={invoiceCategory === "customer-order" ? "text-primary" : "text-muted-foreground"} />
                <div>
                  <p className="font-semibold text-sm">Customer Order Invoice</p>
                  <p className="text-xs text-muted-foreground">Create invoice against an existing customer order</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setInvoiceCategory("stock")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                invoiceCategory === "stock"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <Package size={24} className={invoiceCategory === "stock" ? "text-primary" : "text-muted-foreground"} />
                <div>
                  <p className="font-semibold text-sm">Stock Invoice</p>
                  <p className="text-xs text-muted-foreground">Create invoice directly from available stock</p>
                </div>
              </div>
            </button>
          </div>

          {/* Customer Order Selector - shown only when customer-order category is selected */}
          {invoiceCategory === "customer-order" && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Select Customer Order *
                  </label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => handleOrderSelect(e.target.value)}
                    className={inputCls}
                    disabled={!clientId}
                  >
                    <option value="">
                      {!clientId
                        ? "Select a client first..."
                        : customerOrders.length === 0
                          ? "No orders found for this client"
                          : "Select an order"}
                    </option>
                    {customerOrders.map((order) => (
                      <option
                        key={order.orderId || order.id}
                        value={order.orderId || order.id}
                      >
                        {order.orderNo || order.orderNumber || order.orderId || order.id}
                        {order.orderDate
                          ? ` - ${formatDate(order.orderDate)}`
                          : ""}
                        {order.totalAmount
                          ? ` - ${formatCurrency(order.totalAmount)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {!clientId && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Please select a client in the Bill To section below to load their orders
                    </p>
                  )}
                </div>
                {selectedOrderId && (
                  <div className="flex items-end">
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 text-xs text-green-700 dark:text-green-400">
                      Order selected. Line items have been populated from the order.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==================== SECTION 1: Invoice Header ==================== */}
        <div className="border rounded-xl p-5 bg-card shadow-sm">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Section 1 &mdash; Invoice Header
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                Invoice No
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className={inputCls}
                placeholder="SKH/257/25-26"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                Purchase Order No
              </label>
              <input
                type="text"
                value={purchaseOrderNo}
                onChange={(e) => setPurchaseOrderNo(e.target.value)}
                className={inputCls}
                placeholder="PO Number"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                Purchase Order Date
              </label>
              <input
                type="date"
                value={purchaseOrderDate}
                onChange={(e) => setPurchaseOrderDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                T. Carton Boxes
              </label>
              <input
                type="number"
                min={0}
                value={cartonBoxes || ""}
                onChange={(e) => setCartonBoxes(+e.target.value || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                Total Pairs (auto)
              </label>
              <input
                type="number"
                value={totals.totalPairs}
                readOnly
                className={`${inputCls} bg-muted/30 cursor-not-allowed font-semibold`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                Logistic Partner
              </label>
              <input
                type="text"
                value={logisticPartner}
                onChange={(e) => setLogisticPartner(e.target.value)}
                className={inputCls}
                placeholder="Partner name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                Mode of Transport
              </label>
              <select
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value)}
                className={inputCls}
              >
                <option value="Surface">Surface</option>
                <option value="Air">Air</option>
                <option value="Rail">Rail</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                Vehicle Reg No
              </label>
              <input
                type="text"
                value={vehicleRegNo}
                onChange={(e) => setVehicleRegNo(e.target.value)}
                className={inputCls}
                placeholder="UP80 XX 1234"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                Place of Supply
              </label>
              <input
                type="text"
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                className={inputCls}
                placeholder="State name"
              />
            </div>
            <div className="flex items-end gap-3 col-span-3">
              <button
                type="button"
                onClick={() => setIsInterState(!isInterState)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                  isInterState ? "bg-primary" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isInterState ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm pb-0.5">
                Inter-State Supply{" "}
                <span className="text-xs text-muted-foreground">
                  ({isInterState ? "IGST" : "CGST + SGST"})
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* ==================== SECTION 2: Bill To / Ship To ==================== */}
        <div className="border rounded-xl p-5 bg-card shadow-sm">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Section 2 &mdash; Bill To / Ship To
          </h2>
          <div className="grid grid-cols-2 gap-6">
            {/* BILL TO */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-muted-foreground border-b pb-1">
                Bill To
              </h3>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Client *
                </label>
                <select
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
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
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Full Address
                </label>
                <textarea
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Client full address"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    State
                  </label>
                  <input
                    type="text"
                    value={clientState}
                    onChange={(e) => setClientState(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={clientPincode}
                    onChange={(e) => setClientPincode(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={clientGSTIN}
                    onChange={(e) => setClientGSTIN(e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    GST State Code
                  </label>
                  <input
                    type="text"
                    value={clientGSTStateCode}
                    onChange={(e) =>
                      setClientGSTStateCode(e.target.value)
                    }
                    className={inputCls}
                  />
                </div>
              </div>
              {/* NAME Section */}
              <h3 className="text-xs font-bold uppercase text-muted-foreground border-b pb-1 pt-2">
                Name
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Mobile
                  </label>
                  <input
                    type="text"
                    value={contactMobile}
                    onChange={(e) => setContactMobile(e.target.value)}
                    className={inputCls}
                    placeholder="+91-XXXXX XXXXX"
                  />
                </div>
              </div>
            </div>

            {/* DELIVERY / SHIPPING */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-muted-foreground border-b pb-1">
                Delivery Address / Shipping Address
              </h3>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Branch (Store) *
                </label>
                <select
                  value={storeId}
                  onChange={(e) => handleStoreChange(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select Store / Branch</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.code ? ` (${s.code})` : ""}
                    </option>
                  ))}
                </select>
                {!clientId && stores.length === 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Select a client first to load stores
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Full Address
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Delivery / Shipping address"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    State
                  </label>
                  <input
                    type="text"
                    value={deliveryState}
                    onChange={(e) => setDeliveryState(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={deliveryPincode}
                    onChange={(e) => setDeliveryPincode(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={deliveryGSTIN}
                    onChange={(e) => setDeliveryGSTIN(e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    GST State Code
                  </label>
                  <input
                    type="text"
                    value={deliveryGSTStateCode}
                    onChange={(e) =>
                      setDeliveryGSTStateCode(e.target.value)
                    }
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SECTION 3 + 5: Line Items / Packing (tabbed) ==================== */}
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
          {/* Sub-tabs */}
          <div className="flex border-b bg-muted/20">
            <button
              onClick={() => setEntryTab("invoice")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                entryTab === "invoice"
                  ? "border-primary text-primary bg-background"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Line Items
            </button>
            <button
              onClick={() => setEntryTab("packing")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                entryTab === "packing"
                  ? "border-primary text-primary bg-background"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Packing Details
            </button>
          </div>

          <div className="p-5">
            {entryTab === "invoice" ? (
              <>
                {/* Barcode scan bar */}
                <div className="flex items-center gap-3 mb-4 bg-muted/20 rounded-lg p-3">
                  <ScanLine
                    size={18}
                    className="text-muted-foreground flex-shrink-0"
                  />
                  <input
                    ref={barcodeRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleBarcodeScan(barcodeInput);
                      }
                    }}
                    placeholder="Scan barcode or type and press Enter..."
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    onClick={() => handleBarcodeScan(barcodeInput)}
                    className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                  >
                    Scan
                  </button>
                </div>

                {/* Line Items Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Section 3 &mdash; Line Items
                  </h3>
                  <button
                    onClick={addLineItem}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                  >
                    <Plus size={12} /> Add Line Item
                  </button>
                </div>

                {/* Line Items Table */}
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground w-10">
                          SL
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground w-20">
                          CRT SERIAL
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground w-20">
                          HSN
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[140px]">
                          Description (Article + Color)
                        </th>
                        <th className="px-2 py-2 text-center font-medium text-muted-foreground w-12">
                          UOM
                        </th>
                        {SIZE_COLUMNS.map((s) => (
                          <th
                            key={s}
                            className="px-1 py-2 text-center font-medium text-muted-foreground w-10 text-[10px]"
                          >
                            {s}
                          </th>
                        ))}
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-12">
                          Qty
                        </th>
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-16">
                          MRP/Pair
                        </th>
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-14">
                          Margin%
                        </th>
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-16">
                          Unit Rate
                        </th>
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">
                          Taxable
                        </th>
                        {isInterState ? (
                          <th className="px-2 py-2 text-center font-medium text-muted-foreground w-14">
                            IGST%
                          </th>
                        ) : (
                          <>
                            <th className="px-2 py-2 text-center font-medium text-muted-foreground w-14">
                              SGST%
                            </th>
                            <th className="px-2 py-2 text-center font-medium text-muted-foreground w-14">
                              CGST%
                            </th>
                          </>
                        )}
                        <th className="px-1 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((li, idx) => (
                        <tr
                          key={idx}
                          className="border-b hover:bg-muted/20"
                        >
                          <td className="px-2 py-1 text-center text-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              value={li.crtSerial}
                              onChange={(e) =>
                                updateLineItem(idx, {
                                  crtSerial: e.target.value,
                                })
                              }
                              className={inputSmCls}
                              placeholder="CRT"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              value={li.hsnCode}
                              onChange={(e) =>
                                updateLineItem(idx, {
                                  hsnCode: e.target.value,
                                })
                              }
                              className={`${inputSmCls} font-mono`}
                              placeholder="HSN"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={li.articleName}
                                onChange={(e) =>
                                  updateLineItem(idx, {
                                    articleName: e.target.value,
                                    articleId:
                                      e.target.value || li.articleId,
                                    description: `${e.target.value}${li.color ? " - " + li.color : ""}`,
                                  })
                                }
                                className={`${inputSmCls} flex-1`}
                                placeholder="Article"
                              />
                              <input
                                type="text"
                                value={li.color}
                                onChange={(e) =>
                                  updateLineItem(idx, {
                                    color: e.target.value,
                                    description: `${li.articleName}${e.target.value ? " - " + e.target.value : ""}`,
                                  })
                                }
                                className={`${inputSmCls} w-16`}
                                placeholder="Color"
                              />
                            </div>
                          </td>
                          <td className="px-1 py-1 text-center text-[10px] text-muted-foreground">
                            {li.uom}
                          </td>
                          {SIZE_COLUMNS.map((s) => {
                            const stockForLine = lineStockMap[idx];
                            const availableQty = stockForLine?.[s];
                            const hasStockData = stockForLine !== undefined;
                            const currentVal = li.sizeBreakdown[s] || 0;
                            const isOverStock = hasStockData && availableQty !== undefined && currentVal > availableQty;
                            const isZeroStock = hasStockData && (availableQty === undefined || availableQty === 0);
                            return (
                              <td key={s} className="px-0.5 py-1">
                                <div className="flex flex-col items-center gap-0.5">
                                  <input
                                    type="number"
                                    min={0}
                                    value={
                                      li.sizeBreakdown[s] || ""
                                    }
                                    onChange={(e) =>
                                      updateLineItemSize(
                                        idx,
                                        s,
                                        +e.target.value || 0
                                      )
                                    }
                                    className={`w-full px-0.5 py-0.5 border rounded text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-primary/20 ${
                                      isOverStock
                                        ? "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                                        : isZeroStock
                                          ? "border-input bg-muted/30 text-muted-foreground"
                                          : "border-input"
                                    }`}
                                    disabled={isZeroStock && invoiceCategory === "stock"}
                                    title={
                                      hasStockData
                                        ? `Available: ${availableQty ?? 0}`
                                        : undefined
                                    }
                                  />
                                  {hasStockData && (
                                    <span
                                      className={`text-[8px] leading-none ${
                                        isOverStock
                                          ? "text-red-500 font-semibold"
                                          : isZeroStock
                                            ? "text-muted-foreground/60"
                                            : "text-green-600 dark:text-green-400"
                                      }`}
                                    >
                                      Avl:{availableQty ?? 0}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-2 py-1 text-right text-xs font-semibold">
                            {li.totalQty}
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={li.mrpPerPair || ""}
                              onChange={(e) =>
                                updateLineItem(idx, {
                                  mrpPerPair:
                                    +e.target.value || 0,
                                })
                              }
                              className={`${inputSmCls} text-right`}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              value={li.marginPercent || ""}
                              onChange={(e) =>
                                updateLineItem(idx, {
                                  marginPercent:
                                    +e.target.value || 0,
                                })
                              }
                              className={`${inputSmCls} text-right`}
                            />
                          </td>
                          <td className="px-2 py-1 text-right text-xs font-medium">
                            {formatCurrency(li.unitRate)}
                          </td>
                          <td className="px-2 py-1 text-right text-xs font-semibold text-primary">
                            {formatCurrency(li.taxableValue)}
                          </td>
                          {isInterState ? (
                            <td className="px-2 py-1 text-center text-[10px] text-muted-foreground">
                              {li.igstPercent}%
                            </td>
                          ) : (
                            <>
                              <td className="px-2 py-1 text-center text-[10px] text-muted-foreground">
                                {li.sgstPercent}%
                              </td>
                              <td className="px-2 py-1 text-center text-[10px] text-muted-foreground">
                                {li.cgstPercent}%
                              </td>
                            </>
                          )}
                          <td className="px-1 py-1">
                            {lineItems.length > 1 && (
                              <button
                                onClick={() => removeLineItem(idx)}
                                className="p-1 rounded hover:bg-destructive/10"
                                title="Remove line"
                              >
                                <Trash2
                                  size={12}
                                  className="text-destructive"
                                />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="bg-muted/40 font-semibold text-xs">
                        <td
                          className="px-2 py-2 text-right"
                          colSpan={4}
                        >
                          GRAND TOTAL
                        </td>
                        <td className="px-1 py-2"></td>
                        {SIZE_COLUMNS.map((s) => (
                          <td
                            key={s}
                            className="px-0.5 py-2 text-center text-[10px]"
                          >
                            {totals.sizes[s] || "-"}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-right">
                          {totals.totalPairs}
                        </td>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(totals.taxable)}
                        </td>
                        {isInterState ? (
                          <td className="px-2 py-2 text-right">
                            {formatCurrency(totals.igst)}
                          </td>
                        ) : (
                          <>
                            <td className="px-2 py-2 text-right">
                              {formatCurrency(totals.sgst)}
                            </td>
                            <td className="px-2 py-2 text-right">
                              {formatCurrency(totals.cgst)}
                            </td>
                          </>
                        )}
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              /* ========== PACKING DETAILS TAB ========== */
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Section 5 &mdash; Packing Details (Carton-wise)
                  </h3>
                  <button
                    onClick={addPackingRow}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                  >
                    <Plus size={12} /> Add Carton
                  </button>
                </div>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="px-2 py-2 text-center font-medium text-muted-foreground w-16">
                          Carton No
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[120px]">
                          Article
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground w-20">
                          Colour
                        </th>
                        {SIZE_COLUMNS.map((s) => (
                          <th
                            key={s}
                            className="px-1 py-2 text-center font-medium text-muted-foreground w-10 text-[10px]"
                          >
                            {s}
                          </th>
                        ))}
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-16">
                          Pairs
                        </th>
                        <th className="px-1 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {packingDetails.map((row, idx) => (
                        <tr
                          key={idx}
                          className="border-b hover:bg-muted/20"
                        >
                          <td className="px-1 py-1">
                            <input
                              type="number"
                              min={1}
                              value={row.cartonNo || ""}
                              onChange={(e) =>
                                updatePackingRow(idx, {
                                  cartonNo:
                                    +e.target.value || 1,
                                })
                              }
                              className={`${inputSmCls} text-center`}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              value={row.articleName}
                              onChange={(e) =>
                                updatePackingRow(idx, {
                                  articleName: e.target.value,
                                })
                              }
                              className={inputSmCls}
                              placeholder="Article name"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              value={row.color}
                              onChange={(e) =>
                                updatePackingRow(idx, {
                                  color: e.target.value,
                                })
                              }
                              className={inputSmCls}
                              placeholder="Colour"
                            />
                          </td>
                          {SIZE_COLUMNS.map((s) => (
                            <td key={s} className="px-0.5 py-1">
                              <input
                                type="number"
                                min={0}
                                value={
                                  row.sizeBreakdown[s] || ""
                                }
                                onChange={(e) =>
                                  updatePackingSize(
                                    idx,
                                    s,
                                    +e.target.value || 0
                                  )
                                }
                                className="w-full px-0.5 py-0.5 border border-input rounded text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-primary/20"
                              />
                            </td>
                          ))}
                          <td className="px-2 py-1 text-right text-xs font-semibold">
                            {row.totalPairs}
                          </td>
                          <td className="px-1 py-1">
                            {packingDetails.length > 1 && (
                              <button
                                onClick={() =>
                                  removePackingRow(idx)
                                }
                                className="p-1 rounded hover:bg-destructive/10"
                                title="Remove carton"
                              >
                                <Trash2
                                  size={12}
                                  className="text-destructive"
                                />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ==================== SECTION 4: Totals ==================== */}
        <div className="border rounded-xl p-5 bg-card shadow-sm">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Section 4 &mdash; Totals &amp; Summary
          </h2>

          <div className="grid grid-cols-2 gap-6">
            {/* Amount in words + Bank Details */}
            <div className="space-y-4">
              <div className="bg-muted/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  AMOUNT IN WORDS
                </p>
                <p className="text-sm font-medium italic">
                  {numberToWords(grandTotal)}
                </p>
              </div>
              <div className="bg-muted/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2 font-semibold">
                  BANK DETAILS
                </p>
                <div className="grid grid-cols-[100px_1fr] gap-y-1 text-sm">
                  <span className="text-muted-foreground">A/C Name</span>
                  <span>{DEFAULT_BANK_DETAILS.accountName}</span>
                  <span className="text-muted-foreground">Bank Name</span>
                  <span>{DEFAULT_BANK_DETAILS.bankName}</span>
                  <span className="text-muted-foreground">Branch</span>
                  <span>{DEFAULT_BANK_DETAILS.branch}</span>
                  <span className="text-muted-foreground">A/C No</span>
                  <span className="font-mono">
                    {DEFAULT_BANK_DETAILS.accountNo}
                  </span>
                  <span className="text-muted-foreground">IFS Code</span>
                  <span className="font-mono">
                    {DEFAULT_BANK_DETAILS.ifsCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Tax Description + Grand Total */}
            <div className="space-y-3">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">
                        Tax Description
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">
                        Rate
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-3 py-1.5">Taxable Value</td>
                      <td className="px-3 py-1.5 text-right">-</td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        {formatCurrency(totals.taxable)}
                      </td>
                    </tr>
                    {isInterState ? (
                      <tr className="border-b">
                        <td className="px-3 py-1.5">IGST</td>
                        <td className="px-3 py-1.5 text-right">
                          {lineItems[0]?.igstPercent || 0}%
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {formatCurrency(totals.igst)}
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr className="border-b">
                          <td className="px-3 py-1.5">SGST</td>
                          <td className="px-3 py-1.5 text-right">
                            {lineItems[0]?.sgstPercent || 0}%
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono">
                            {formatCurrency(totals.sgst)}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-3 py-1.5">CGST</td>
                          <td className="px-3 py-1.5 text-right">
                            {lineItems[0]?.cgstPercent || 0}%
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono">
                            {formatCurrency(totals.cgst)}
                          </td>
                        </tr>
                      </>
                    )}
                    <tr className="border-b bg-muted/30 font-semibold">
                      <td className="px-3 py-1.5">Total GST</td>
                      <td className="px-3 py-1.5 text-right">-</td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        {formatCurrency(
                          totals.sgst + totals.cgst + totals.igst
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-muted/20 rounded-lg p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GROSS TOTAL</span>
                  <span className="font-mono">
                    {formatCurrency(grossTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    TOTAL DISCOUNT
                  </span>
                  <span className="font-mono">{formatCurrency(0)}</span>
                </div>
                {isInterState ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TOTAL IGST</span>
                    <span className="font-mono">
                      {formatCurrency(totals.igst)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        TOTAL SGST
                      </span>
                      <span className="font-mono">
                        {formatCurrency(totals.sgst)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        TOTAL CGST
                      </span>
                      <span className="font-mono">
                        {formatCurrency(totals.cgst)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TOTAL</span>
                  <span className="font-mono">
                    {formatCurrency(grossTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ROUND OFF</span>
                  <span className="font-mono">
                    {roundOff >= 0 ? "+" : ""}
                    {roundOff.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-base">
                  <span>GRAND TOTAL</span>
                  <span className="text-primary font-mono">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms + Declaration + Signature */}
          <div className="mt-5 grid grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div className="bg-muted/10 rounded-lg p-3">
              <p className="font-semibold text-foreground mb-1">
                Terms and Conditions
              </p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>
                  Goods once sold will not be taken back or exchanged.
                </li>
                <li>
                  Interest @ 18% p.a. will be charged if payment is not
                  made within due date.
                </li>
                <li>
                  All disputes are subject to Agra jurisdiction only.
                </li>
                <li>E. &amp; O.E.</li>
              </ol>
            </div>
            <div className="bg-muted/10 rounded-lg p-3">
              <p className="font-semibold text-foreground mb-1">
                Declaration
              </p>
              <p>
                We declare that this invoice shows the actual price of
                the goods described and that all particulars are true and
                correct.
              </p>
            </div>
            <div className="bg-muted/10 rounded-lg p-3 flex flex-col justify-between">
              <p className="font-semibold text-foreground mb-1">
                Authorised Signature
              </p>
              <div className="text-right mt-4">
                <p className="text-foreground font-medium">
                  For EL CURIO / SKH EXPORTS
                </p>
                <div className="w-40 border-b border-gray-400 mt-6 ml-auto"></div>
                <p className="mt-1 font-medium text-foreground">
                  Authorised Signatory
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<TabType>("Tax Invoice");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modals
  const [entryOpen, setEntryOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterClientId, setFilterClientId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Dropdowns
  const [clients, setClients] = useState<DropdownItem[]>([]);

  /* ---------- FETCH ---------- */

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/invoices", {
        params: {
          searchTerm: search || undefined,
          pageNumber: page,
          pageSize: 25,
          clientId: filterClientId || undefined,
          status: filterStatus || undefined,
          dateFrom: filterDateFrom || undefined,
          dateTo: filterDateTo || undefined,
        },
      });
      if (data.success) {
        setInvoices(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterClientId, filterStatus, filterDateFrom, filterDateTo]);

  const fetchDropdowns = async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/clients", {
        params: { pageSize: 500 },
      });
      if (data.success) {
        const items = data.data?.items || data.data || [];
        setClients(
          items.map((c: any) => ({
            id: c.clientId,
            name: c.clientName,
            gstin: c.gstin,
            gstStateCode: c.gstStateCode,
            address: c.address,
            state: c.state,
            pincode: c.pincode,
            contact: c.contactNumber,
            mobile: c.mobile,
          }))
        );
      }
    } catch {
      /* silent */
    }
  };

  const fetchInvoiceDetail = async (
    invoiceId: string
  ): Promise<Invoice | null> => {
    try {
      const { data } = await api.get<ApiResponse<Invoice>>(
        `/api/invoices/${invoiceId}`
      );
      if (data.success && data.data) return data.data;
    } catch {
      /* silent */
    }
    return null;
  };

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  /* ---------- CRUD ---------- */

  const openAdd = () => {
    setEditingInvoice(null);
    setEntryOpen(true);
  };

  const openEdit = async (invoice: Invoice) => {
    const detail = await fetchInvoiceDetail(invoice.invoiceId);
    setEditingInvoice(detail || invoice);
    setEntryOpen(true);
  };

  const handleView = async (invoice: Invoice) => {
    const detail = await fetchInvoiceDetail(invoice.invoiceId);
    setViewingInvoice(detail || invoice);
  };

  const handlePrint = async (invoice: Invoice) => {
    const detail = await fetchInvoiceDetail(invoice.invoiceId);
    setPrintingInvoice(detail || invoice);
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Delete invoice "${invoice.invoiceNo}"?`)) return;
    try {
      await api.delete(`/api/invoices/${invoice.invoiceId}`);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete invoice");
    }
  };

  /* ---------- COLUMNS ---------- */

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNo",
      header: "Invoice No",
      className: "font-mono text-xs font-medium whitespace-nowrap",
    },
    {
      key: "invoiceDate",
      header: "Date",
      render: (i) => formatDate(i.invoiceDate),
    },
    { key: "clientName", header: "Client" },
    { key: "storeName", header: "Store" },
    {
      key: "cartonBoxes",
      header: "T. Carton Boxes",
      render: (i) => <span>{i.cartonBoxes || 0}</span>,
      className: "text-right",
    },
    {
      key: "totalPairs",
      header: "Total Pairs",
      render: (i) => (
        <span className="font-semibold">{i.totalPairs || 0}</span>
      ),
      className: "text-right",
    },
    {
      key: "logisticPartner",
      header: "Logistic",
      render: (i) => <span>{i.logisticPartner || "-"}</span>,
    },
    {
      key: "transportMode",
      header: "Mode of Transport",
      render: (i) => <span>{i.transportMode || "-"}</span>,
    },
    {
      key: "vehicleRegNo",
      header: "Vehicle Reg No",
      render: (i) => (
        <span className="font-mono text-xs">{i.vehicleRegNo || "-"}</span>
      ),
    },
    {
      key: "placeOfSupply",
      header: "Place of Supply",
      render: (i) => <span>{i.placeOfSupply || "-"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (i) => <StatusBadge status={i.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (i) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleView(i);
            }}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="View"
          >
            <Eye size={13} className="text-muted-foreground" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrint(i);
            }}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Print"
          >
            <Printer size={13} className="text-muted-foreground" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(i);
            }}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Edit"
          >
            <Edit2 size={13} className="text-muted-foreground" />
          </button>
        </div>
      ),
    },
  ];

  /* ---------- RENDER ---------- */

  return (
    <>
      <div className="space-y-4">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              Tax Invoice &amp; Packing List
            </h1>
            <p className="text-sm text-muted-foreground">
              Combined invoice and packing entry with GST calculations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
            >
              <Filter size={14} /> Filter
            </button>
            <button
              onClick={() => alert("Export feature coming soon")}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
            >
              <Download size={14} /> Export
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Plus size={14} /> New Invoice
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filter Panel */}
        {filterOpen && (
          <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Date From
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Date To
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Client
                </label>
                <select
                  value={filterClientId}
                  onChange={(e) => setFilterClientId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">All Clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={inputCls}
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="FINALIZED">Finalized</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setFilterDateFrom("");
                  setFilterDateTo("");
                  setFilterClientId("");
                  setFilterStatus("");
                }}
                className="px-3 py-1.5 text-xs border rounded-lg hover:bg-muted"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Data Table - same list for both tabs */}
        <DataTable
          title=""
          columns={columns}
          data={invoices}
          totalCount={totalCount}
          pageNumber={page}
          pageSize={25}
          onPageChange={setPage}
          onSearch={setSearch}
          onDelete={handleDelete}
          loading={loading}
          keyExtractor={(i) => i.invoiceId}
        />
      </div>

      {/* ========== INVOICE ENTRY (Full-screen) ========== */}
      {entryOpen && (
        <InvoiceEntryScreen
          editingInvoice={editingInvoice}
          clients={clients}
          onClose={() => setEntryOpen(false)}
          onSaved={() => fetchInvoices()}
        />
      )}

      {/* ========== VIEW INVOICE MODAL ========== */}
      {viewingInvoice && (
        <ViewInvoiceModal
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
        />
      )}

      {/* ========== PRINT INVOICE MODAL ========== */}
      {printingInvoice && (
        <PrintInvoiceView
          invoice={printingInvoice}
          printTab={activeTab}
          onClose={() => setPrintingInvoice(null)}
        />
      )}
    </>
  );
}
