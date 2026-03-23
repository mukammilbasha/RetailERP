"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Trash2, Printer } from "lucide-react";

/* ================================================================
   TYPES
   ================================================================ */

interface PackingList {
  packingListId: string;
  packingNo: string;
  invoiceId: string;
  invoiceNo: string;
  packingDate: string;
  clientId?: string;
  clientName: string;
  clientAddress?: string;
  clientGSTIN?: string;
  clientGSTStateCode?: string;
  clientContact?: string;
  contactPerson?: string;
  contactMobile?: string;
  deliveryAddress?: string;
  shippingAddress?: string;
  storeId?: string;
  storeName: string;
  storeCode?: string;
  totalCartons: number;
  totalPairs: number;
  logisticPartner: string;
  transportMode: string;
  vehicleRegNo: string;
  placeOfSupply: string;
  status: string;
  lineItems?: PackingLineItem[];
  cartons?: Carton[];
  bankDetails?: BankDetails;
}

interface PackingLineItem {
  slNo?: number;
  crtSerial?: string;
  hsnCode?: string;
  description?: string;
  styleName?: string;
  articleName?: string;
  quantity: number;
  uom?: string;
  mrp: number;
  unitRate: number;
  taxableValue: number;
  sgstPercent: number;
  sgstAmount: number;
  cgstPercent: number;
  cgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  sizeBreakdown?: Record<string, number>;
}

interface Invoice {
  invoiceId: string;
  invoiceNo: string;
  clientName: string;
  storeName: string;
  invoiceDate?: string;
  isInterState?: boolean;
}

interface Carton {
  cartonNumber: string;
  pairsPerCarton: number;
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

const inputCls =
  "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

const TRANSPORT_MODES = ["Road", "Rail", "Air", "Sea", "Courier"];

/* ================================================================
   HELPERS
   ================================================================ */

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);
  let result = convert(intPart) + " Rupees";
  if (decPart > 0) result += " and " + convert(decPart) + " Paise";
  return result + " Only";
}

/* ================================================================
   PRINT PACKING VIEW
   ================================================================ */

function PrintPackingView({ packing, onClose }: { packing: PackingList; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const items = packing.lineItems || [];
  const isInterState = false; // Default to intra-state; override from linked invoice if available

  const totals = items.reduce(
    (acc, li) => {
      acc.qty += li.quantity;
      acc.taxableValue += li.taxableValue;
      acc.sgst += li.sgstAmount;
      acc.cgst += li.cgstAmount;
      acc.igst += li.igstAmount;
      return acc;
    },
    { qty: 0, taxableValue: 0, sgst: 0, cgst: 0, igst: 0 }
  );

  const grandTotal = totals.taxableValue + totals.sgst + totals.cgst + totals.igst;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 max-h-[95vh] overflow-y-auto">
        {/* Screen-only controls */}
        <div className="flex items-center justify-between p-4 border-b print:hidden">
          <h2 className="text-lg font-semibold">Print Preview - Packing Detail</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Close</button>
          </div>
        </div>

        {/* Printable content */}
        <div ref={printRef} className="p-6 print-packing-content" id="print-packing">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-3 mb-4">
            <h1 className="text-lg font-bold tracking-wide">PACKING DETAIL - TAX INVOICE FORMAT</h1>
          </div>

          {/* Company Info */}
          <div className="flex justify-between items-start mb-4 border border-black p-3">
            <div>
              <h2 className="text-base font-bold">EL CURIO / SKH EXPORTS</h2>
              <p className="text-xs text-gray-700 mt-0.5">Manufacturer &amp; Exporter of Leather Goods</p>
            </div>
            <div className="text-right text-xs">
              <p>Plot No. 123, Industrial Area</p>
              <p>Agra, Uttar Pradesh - 282007</p>
              <p>Phone: +91-562-XXXXXXX</p>
              <p>Email: info@elcurio.com</p>
            </div>
          </div>

          {/* GSTIN */}
          <div className="border border-black px-3 py-1.5 mb-4 text-sm">
            <span className="font-semibold">GSTIN: </span>
            <span className="font-mono">09AXXXX1234X1Z5</span>
          </div>

          {/* Packing Details Row */}
          <div className="grid grid-cols-5 border border-black text-xs mb-4">
            <div className="border-r border-black p-2">
              <span className="font-semibold block">Packing No</span>
              <span>{packing.packingNo}</span>
            </div>
            <div className="border-r border-black p-2">
              <span className="font-semibold block">Date</span>
              <span>{formatDate(packing.packingDate)}</span>
            </div>
            <div className="border-r border-black p-2">
              <span className="font-semibold block">Invoice No</span>
              <span className="font-mono">{packing.invoiceNo}</span>
            </div>
            <div className="border-r border-black p-2">
              <span className="font-semibold block">Carton Boxes</span>
              <span>{packing.totalCartons}</span>
            </div>
            <div className="p-2">
              <span className="font-semibold block">Total Pairs</span>
              <span>{packing.totalPairs}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 border border-black text-xs mb-4">
            <div className="border-r border-black p-2">
              <span className="font-semibold block">Logistic Partner</span>
              <span>{packing.logisticPartner || "-"}</span>
            </div>
            <div className="border-r border-black p-2">
              <span className="font-semibold block">Mode of Transport</span>
              <span>{packing.transportMode || "-"}</span>
              {packing.vehicleRegNo && (
                <span className="block mt-0.5">Vehicle Reg No: {packing.vehicleRegNo}</span>
              )}
            </div>
            <div className="p-2">
              <span className="font-semibold block">Place of Supply</span>
              <span>{packing.placeOfSupply || "-"}</span>
            </div>
          </div>

          {/* BILL TO / NAME / DELIVERY */}
          <div className="grid grid-cols-2 border border-black text-xs mb-4">
            <div className="border-r border-black p-3">
              <h3 className="font-bold text-sm mb-1 border-b border-black pb-1">BILL TO</h3>
              <p className="font-semibold">{packing.clientName}</p>
              <p>{packing.clientAddress || "Client Address"}</p>
              <p>Contact: {packing.clientContact || "-"}</p>
              <p>GSTIN: <span className="font-mono">{packing.clientGSTIN || "-"}</span></p>
              <p>GST State Code: {packing.clientGSTStateCode || "-"}</p>
            </div>
            <div className="p-3">
              <h3 className="font-bold text-sm mb-1 border-b border-black pb-1">NAME</h3>
              <p>Contact Person: {packing.contactPerson || "-"}</p>
              <p>Mobile: {packing.contactMobile || "-"}</p>
              <div className="mt-2 border-t border-black pt-1">
                <h3 className="font-bold text-sm mb-1">DELIVERY / SHIPPING ADDRESS</h3>
                <p>{packing.deliveryAddress || packing.shippingAddress || "-"}</p>
              </div>
              <div className="mt-2 border-t border-black pt-1">
                <h3 className="font-bold text-sm">BRANCH</h3>
                <p>{packing.storeCode || packing.storeName}</p>
              </div>
            </div>
          </div>

          {/* Carton Details */}
          {packing.cartons && packing.cartons.length > 0 && (
            <div className="border border-black mb-4 p-3">
              <h3 className="font-bold text-sm mb-2">CARTON DETAILS</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black px-2 py-1 text-left font-semibold">Carton No</th>
                    <th className="border border-black px-2 py-1 text-right font-semibold">Pairs</th>
                  </tr>
                </thead>
                <tbody>
                  {packing.cartons.map((c, idx) => (
                    <tr key={idx}>
                      <td className="border border-black px-2 py-1">{c.cartonNumber}</td>
                      <td className="border border-black px-2 py-1 text-right">{c.pairsPerCarton}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-black px-2 py-1">TOTAL ({packing.cartons.length} Cartons)</td>
                    <td className="border border-black px-2 py-1 text-right">{packing.totalPairs}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Line Items Table */}
          {items.length > 0 && (
            <div className="border border-black mb-4 overflow-x-auto">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black px-1 py-1.5 text-center font-semibold" rowSpan={2}>SL No</th>
                    <th className="border border-black px-1 py-1.5 text-center font-semibold" rowSpan={2}>CRT SERIAL</th>
                    <th className="border border-black px-1 py-1.5 text-center font-semibold" rowSpan={2}>HSN Code</th>
                    <th className="border border-black px-1 py-1.5 text-center font-semibold" rowSpan={2}>Description</th>
                    <th className="border border-black px-1 py-1.5 text-center font-semibold" rowSpan={2}>Qty</th>
                    <th className="border border-black px-1 py-1.5 text-center font-semibold" rowSpan={2}>UOM</th>
                    <th className="border border-black px-1 py-1.5 text-center font-semibold" colSpan={8}>Size Breakdown</th>
                    <th className="border border-black px-1 py-1.5 text-center font-semibold" rowSpan={2}>MRP Per Pair</th>
                    <th className="border border-black px-1 py-1.5 text-center font-semibold" rowSpan={2}>Unit Rate</th>
                    <th className="border border-black px-1 py-1.5 text-center font-semibold" rowSpan={2}>Taxable Value</th>
                    {isInterState ? (
                      <th className="border border-black px-1 py-1.5 text-center font-semibold" rowSpan={2}>IGST 18%</th>
                    ) : (
                      <>
                        <th className="border border-black px-1 py-1.5 text-center font-semibold" rowSpan={2}>SGST 9%</th>
                        <th className="border border-black px-1 py-1.5 text-center font-semibold" rowSpan={2}>CGST 9%</th>
                      </>
                    )}
                  </tr>
                  <tr className="bg-gray-50">
                    {["39-05", "40-06", "41-07", "42-08", "43-09", "44-10", "45-11", "46-12"].map((s) => (
                      <th key={s} className="border border-black px-1 py-1 text-center font-medium text-[9px]">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((li, idx) => {
                    const sizes = li.sizeBreakdown || {};
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border border-black px-1 py-1 text-center">{li.slNo || idx + 1}</td>
                        <td className="border border-black px-1 py-1 text-center font-mono">{li.crtSerial || "-"}</td>
                        <td className="border border-black px-1 py-1 text-center font-mono">{li.hsnCode || "-"}</td>
                        <td className="border border-black px-1 py-1">{li.description || li.styleName || li.articleName || "-"}</td>
                        <td className="border border-black px-1 py-1 text-center font-semibold">{li.quantity}</td>
                        <td className="border border-black px-1 py-1 text-center">{li.uom || "Pair"}</td>
                        {["39-05", "40-06", "41-07", "42-08", "43-09", "44-10", "45-11", "46-12"].map((s) => (
                          <td key={s} className="border border-black px-1 py-1 text-center">{sizes[s] || "-"}</td>
                        ))}
                        <td className="border border-black px-1 py-1 text-right">{formatCurrency(li.mrp)}</td>
                        <td className="border border-black px-1 py-1 text-right">{formatCurrency(li.unitRate)}</td>
                        <td className="border border-black px-1 py-1 text-right">{formatCurrency(li.taxableValue)}</td>
                        {isInterState ? (
                          <td className="border border-black px-1 py-1 text-right">{formatCurrency(li.igstAmount)}</td>
                        ) : (
                          <>
                            <td className="border border-black px-1 py-1 text-right">{formatCurrency(li.sgstAmount)}</td>
                            <td className="border border-black px-1 py-1 text-right">{formatCurrency(li.cgstAmount)}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {/* GRAND TOTAL */}
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-black px-1 py-2 text-center" colSpan={4}>GRAND TOTAL</td>
                    <td className="border border-black px-1 py-2 text-center">{totals.qty}</td>
                    <td className="border border-black px-1 py-2" colSpan={9}></td>
                    <td className="border border-black px-1 py-2 text-right">{formatCurrency(totals.taxableValue)}</td>
                    {isInterState ? (
                      <td className="border border-black px-1 py-2 text-right">{formatCurrency(totals.igst)}</td>
                    ) : (
                      <>
                        <td className="border border-black px-1 py-2 text-right">{formatCurrency(totals.sgst)}</td>
                        <td className="border border-black px-1 py-2 text-right">{formatCurrency(totals.cgst)}</td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Amount in Words */}
          <div className="border border-black p-3 mb-4 text-xs">
            <span className="font-semibold">AMOUNT IN WORDS: </span>
            <span className="italic">{numberToWords(grandTotal)}</span>
          </div>

          {/* Bank Details & Tax Breakdown */}
          <div className="grid grid-cols-2 border border-black text-xs mb-4">
            <div className="border-r border-black p-3">
              <h3 className="font-bold text-sm mb-2 border-b border-black pb-1">BANK DETAILS</h3>
              <table className="text-xs w-full">
                <tbody>
                  <tr><td className="py-0.5 font-semibold pr-3 w-24">A/C Name</td><td>{packing.bankDetails?.accountName || "SKH EXPORTS"}</td></tr>
                  <tr><td className="py-0.5 font-semibold pr-3">Bank Name</td><td>{packing.bankDetails?.bankName || "State Bank of India"}</td></tr>
                  <tr><td className="py-0.5 font-semibold pr-3">Branch</td><td>{packing.bankDetails?.branch || "Agra Main Branch"}</td></tr>
                  <tr><td className="py-0.5 font-semibold pr-3">A/C No</td><td className="font-mono">{packing.bankDetails?.accountNo || "XXXXXXXXXXXX"}</td></tr>
                  <tr><td className="py-0.5 font-semibold pr-3">IFS Code</td><td className="font-mono">{packing.bankDetails?.ifsCode || "SBIN0000XXX"}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="p-3">
              <h3 className="font-bold text-sm mb-2 border-b border-black pb-1">TAX BREAKDOWN</h3>
              <table className="text-xs w-full">
                <tbody>
                  <tr><td className="py-0.5 font-semibold pr-3">Taxable Value</td><td className="text-right font-mono">{formatCurrency(totals.taxableValue)}</td></tr>
                  {isInterState ? (
                    <tr><td className="py-0.5 font-semibold pr-3">IGST (18%)</td><td className="text-right font-mono">{formatCurrency(totals.igst)}</td></tr>
                  ) : (
                    <>
                      <tr><td className="py-0.5 font-semibold pr-3">SGST (9%)</td><td className="text-right font-mono">{formatCurrency(totals.sgst)}</td></tr>
                      <tr><td className="py-0.5 font-semibold pr-3">CGST (9%)</td><td className="text-right font-mono">{formatCurrency(totals.cgst)}</td></tr>
                    </>
                  )}
                  <tr className="border-t border-black font-bold">
                    <td className="py-1 pr-3">Total GST</td>
                    <td className="text-right font-mono">{formatCurrency(totals.sgst + totals.cgst + totals.igst)}</td>
                  </tr>
                  <tr className="font-bold text-sm">
                    <td className="py-1 pr-3">GRAND TOTAL</td>
                    <td className="text-right font-mono">{formatCurrency(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="border border-black p-3 mb-4 text-xs">
            <h3 className="font-bold text-sm mb-1">TERMS AND CONDITIONS</h3>
            <ol className="list-decimal list-inside space-y-0.5 text-gray-700">
              <li>Goods once sold will not be taken back or exchanged.</li>
              <li>Interest @ 18% p.a. will be charged if payment is not made within due date.</li>
              <li>All disputes are subject to Agra jurisdiction only.</li>
              <li>E. &amp; O.E.</li>
            </ol>
          </div>

          {/* Declaration */}
          <div className="border border-black p-3 mb-4 text-xs">
            <h3 className="font-bold text-sm mb-1">DECLARATION</h3>
            <p className="text-gray-700">
              We declare that this invoice shows the actual price of the goods described and that all particulars
              are true and correct.
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
          body * {
            visibility: hidden;
          }
          .print-packing-content,
          .print-packing-content * {
            visibility: visible !important;
          }
          .print-packing-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10mm;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
        }
      `}</style>
    </div>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */

export default function PackingListsPage() {
  const [packingLists, setPackingLists] = useState<PackingList[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [printingPacking, setPrintingPacking] = useState<PackingList | null>(null);

  // Dropdown data
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Form state
  const [formInvoiceId, setFormInvoiceId] = useState("");
  const [formCartons, setFormCartons] = useState<Carton[]>([{ cartonNumber: "", pairsPerCarton: 0 }]);
  const [formTransportMode, setFormTransportMode] = useState("");
  const [formLogisticsPartner, setFormLogisticsPartner] = useState("");
  const [formVehicleNumber, setFormVehicleNumber] = useState("");
  const [formPlaceOfSupply, setFormPlaceOfSupply] = useState("");
  const [saving, setSaving] = useState(false);

  const totalPairs = formCartons.reduce((sum, c) => sum + (c.pairsPerCarton || 0), 0);

  /* ---------- FETCH ---------- */

  const fetchPackingLists = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/packing", {
        params: {
          searchTerm: search || undefined,
          pageNumber: page,
          pageSize: 25,
        },
      });
      if (data.success) {
        setPackingLists(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setPackingLists([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchInvoices = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/invoices", {
        params: { pageSize: 200 },
      });
      if (data.success) setInvoices(data.data?.items || []);
    } catch {
      /* silent */
    }
  }, []);

  const fetchPackingDetail = async (packingListId: string): Promise<PackingList | null> => {
    try {
      const { data } = await api.get<ApiResponse<PackingList>>(`/api/packing/${packingListId}`);
      if (data.success && data.data) return data.data;
    } catch { /* silent */ }
    return null;
  };

  useEffect(() => { fetchPackingLists(); }, [fetchPackingLists]);
  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  /* ---------- FORM HELPERS ---------- */

  const resetForm = () => {
    setFormInvoiceId("");
    setFormCartons([{ cartonNumber: "", pairsPerCarton: 0 }]);
    setFormTransportMode("");
    setFormLogisticsPartner("");
    setFormVehicleNumber("");
    setFormPlaceOfSupply("");
  };

  const openAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const addCarton = () => {
    setFormCartons((prev) => [...prev, { cartonNumber: "", pairsPerCarton: 0 }]);
  };

  const removeCarton = (index: number) => {
    if (formCartons.length <= 1) return;
    setFormCartons((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCarton = (index: number, field: keyof Carton, value: string) => {
    setFormCartons((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        if (field === "pairsPerCarton") {
          const num = parseInt(value) || 0;
          return { ...c, [field]: num < 0 ? 0 : num };
        }
        return { ...c, [field]: value };
      })
    );
  };

  /* ---------- CRUD ---------- */

  const handleSave = async () => {
    if (!formInvoiceId) {
      alert("Please select an invoice.");
      return;
    }
    const validCartons = formCartons.filter((c) => c.cartonNumber.trim() && c.pairsPerCarton > 0);
    if (validCartons.length === 0) {
      alert("Please add at least one carton with a number and pairs count.");
      return;
    }
    if (!formTransportMode) {
      alert("Please select a transport mode.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/packing", {
        invoiceId: formInvoiceId,
        cartons: validCartons,
        totalCartons: validCartons.length,
        totalPairs,
        transportMode: formTransportMode,
        logisticPartner: formLogisticsPartner || undefined,
        vehicleRegNo: formVehicleNumber || undefined,
        placeOfSupply: formPlaceOfSupply || undefined,
      });
      setModalOpen(false);
      fetchPackingLists();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save packing list");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pl: PackingList) => {
    if (!window.confirm(`Delete packing list "${pl.packingNo}"?`)) return;
    try {
      await api.delete(`/api/packing/${pl.packingListId}`);
      fetchPackingLists();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete packing list");
    }
  };

  const handlePrint = async (pl: PackingList) => {
    const detail = await fetchPackingDetail(pl.packingListId);
    setPrintingPacking(detail || pl);
  };

  /* ---------- COLUMNS ---------- */

  const columns: Column<PackingList>[] = [
    { key: "packingNo", header: "Packing No", className: "font-mono text-xs font-medium whitespace-nowrap" },
    { key: "invoiceNo", header: "Invoice No", className: "font-mono text-xs whitespace-nowrap" },
    { key: "packingDate", header: "Date", render: (p) => formatDate(p.packingDate) },
    { key: "clientName", header: "Client" },
    { key: "storeName", header: "Store" },
    {
      key: "totalCartons", header: "Carton Boxes",
      render: (p) => <span className="font-semibold">{p.totalCartons}</span>,
      className: "text-right",
    },
    {
      key: "totalPairs", header: "Total Pairs",
      render: (p) => <span className="font-semibold">{p.totalPairs}</span>,
      className: "text-right",
    },
    { key: "logisticPartner", header: "Logistic", render: (p) => <span>{p.logisticPartner || "-"}</span> },
    { key: "transportMode", header: "Transport Mode" },
    { key: "vehicleRegNo", header: "Vehicle No", render: (p) => <span className="font-mono text-xs">{p.vehicleRegNo || "-"}</span> },
    { key: "placeOfSupply", header: "Place of Supply", render: (p) => <span>{p.placeOfSupply || "-"}</span> },
    {
      key: "status", header: "Status",
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: "actions", header: "Print",
      render: (p) => (
        <button
          onClick={(e) => { e.stopPropagation(); handlePrint(p); }}
          className="p-1.5 rounded hover:bg-muted transition-colors" title="Print"
        >
          <Printer size={13} className="text-muted-foreground" />
        </button>
      ),
    },
  ];

  /* ---------- RENDER ---------- */

  return (
    <>
      <DataTable
        title="Packing Lists"
        subtitle="Manage carton packing details linked to invoices"
        columns={columns}
        data={packingLists}
        totalCount={totalCount}
        pageNumber={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={openAdd}
        onDelete={handleDelete}
        onExport={() => alert("Export feature coming soon")}
        addLabel="Add Packing List"
        loading={loading}
        keyExtractor={(p) => p.packingListId}
      />

      {/* ========== ADD PACKING LIST MODAL ========== */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Packing List"
        subtitle="Create a new packing list linked to an invoice"
        size="xl"
      >
        <div className="space-y-4">
          {/* Invoice Selection */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Invoice *</label>
            <select value={formInvoiceId} onChange={(e) => setFormInvoiceId(e.target.value)} className={inputCls}>
              <option value="">Select Invoice</option>
              {invoices.map((inv) => (
                <option key={inv.invoiceId} value={inv.invoiceId}>
                  {inv.invoiceNo} - {inv.clientName}{inv.storeName ? ` / ${inv.storeName}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Carton Details */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Carton Details *</label>
              <button type="button" onClick={addCarton} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus size={12} /> Add Carton
              </button>
            </div>
            <div className="space-y-2">
              {formCartons.map((carton, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={carton.cartonNumber}
                      onChange={(e) => updateCarton(index, "cartonNumber", e.target.value)}
                      placeholder={`Carton ${index + 1} number`}
                      className={inputCls}
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      min="0"
                      value={carton.pairsPerCarton || ""}
                      onChange={(e) => updateCarton(index, "pairsPerCarton", e.target.value)}
                      placeholder="Pairs"
                      className={`${inputCls} text-center`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCarton(index)}
                    disabled={formCartons.length <= 1}
                    className="p-1.5 rounded hover:bg-destructive/10 transition-colors disabled:opacity-30"
                    title="Remove carton"
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">
                Total Cartons: <span className="font-semibold text-foreground">{formCartons.filter((c) => c.cartonNumber.trim()).length}</span>
              </span>
              <span className="text-muted-foreground">
                Total Pairs: <span className="font-semibold text-foreground">{totalPairs}</span>
              </span>
            </div>
          </div>

          {/* Transport Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Transport Mode *</label>
              <select value={formTransportMode} onChange={(e) => setFormTransportMode(e.target.value)} className={inputCls}>
                <option value="">Select Mode</option>
                {TRANSPORT_MODES.map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Logistics Partner</label>
              <input
                type="text"
                value={formLogisticsPartner}
                onChange={(e) => setFormLogisticsPartner(e.target.value)}
                placeholder="Transporter name"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Vehicle Reg No</label>
              <input
                type="text"
                value={formVehicleNumber}
                onChange={(e) => setFormVehicleNumber(e.target.value)}
                placeholder="e.g., MH12AB1234"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Place of Supply</label>
              <input
                type="text"
                value={formPlaceOfSupply}
                onChange={(e) => setFormPlaceOfSupply(e.target.value)}
                placeholder="e.g., Maharashtra"
                className={inputCls}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create Packing List"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========== PRINT PACKING MODAL ========== */}
      {printingPacking && (
        <PrintPackingView packing={printingPacking} onClose={() => setPrintingPacking(null)} />
      )}
    </>
  );
}
