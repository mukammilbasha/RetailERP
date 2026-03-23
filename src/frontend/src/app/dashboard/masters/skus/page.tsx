"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

/* ---------- types ---------- */
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
}

interface SkuRow {
  id: string;
  barcode: string;
  eanCode: string;
  articleCode: string;
  articleName: string;
  brandName: string;
  categoryName: string;
  segmentName: string;
  color: string;
  size: string;
  euroSize: number | null;
  mrp: number;
}

/* ---------- constants ---------- */
const EURO_SIZES = [39, 40, 41, 42, 43, 44, 45, 46];
const PAGE_SIZE = 25;

/* ---------- barcode helpers ---------- */
function generateBarcode(articleCode: string, euroSize: number | null): string {
  const yearPrefix = new Date().getFullYear().toString().slice(-2);
  const codeClean = articleCode.replace(/-/g, "");
  if (euroSize !== null) {
    const sizeStr = euroSize.toString().padStart(2, "0");
    return `B${yearPrefix}${codeClean}-${sizeStr}`;
  }
  return `B${yearPrefix}${codeClean}`;
}

function generateEan13(articleIndex: number, sizeIndex: number): string {
  const base = 8596119;
  const artPart = articleIndex.toString().padStart(3, "0");
  const sizePart = sizeIndex.toString().padStart(3, "0");
  const partial = `${base}${artPart}${sizePart}`;

  // Calculate check digit for EAN-13
  const digits = partial.slice(0, 12).split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${partial.slice(0, 12)}${checkDigit}`;
}

/* ---------- simulated barcode CSS stripes ---------- */
function BarcodeVisual({ code }: { code: string }) {
  // Generate deterministic bar widths from the code characters
  const bars: number[] = [];
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    bars.push(charCode % 2 === 0 ? 2 : 1);
    bars.push(charCode % 3 === 0 ? 3 : 1);
    bars.push(charCode % 5 === 0 ? 2 : 1);
  }
  // Ensure we have enough bars
  while (bars.length < 60) {
    bars.push(bars.length % 2 === 0 ? 2 : 1);
  }

  return (
    <div className="flex items-end justify-center gap-px h-16 mt-4 mb-2">
      {bars.slice(0, 60).map((width, i) => (
        <div
          key={i}
          className={i % 2 === 0 ? "bg-black" : "bg-transparent"}
          style={{
            width: `${width}px`,
            height: `${44 + (i % 7) * 3}px`,
          }}
        />
      ))}
    </div>
  );
}

/* ========== MAIN PAGE ========== */
export default function SkusPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState<SkuRow | null>(null);

  /* ---- fetch articles ---- */
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/articles", {
        params: { pageSize: 500 },
      });
      if (data.success) {
        setArticles(data.data?.items || []);
      }
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  /* ---- generate SKU rows from articles ---- */
  const allSkus: SkuRow[] = useMemo(() => {
    const rows: SkuRow[] = [];
    articles.forEach((article, artIdx) => {
      if (article.isSizeBased) {
        EURO_SIZES.forEach((euroSize, sizeIdx) => {
          const barcode = generateBarcode(article.articleCode, euroSize);
          const eanCode = generateEan13(artIdx, sizeIdx);
          rows.push({
            id: `${article.articleId}-${euroSize}`,
            barcode,
            eanCode,
            articleCode: article.articleCode,
            articleName: article.articleName,
            brandName: article.brandName,
            categoryName: article.categoryName,
            segmentName: article.segmentName,
            color: article.color,
            size: euroSize.toString(),
            euroSize,
            mrp: article.mrp,
          });
        });
      } else {
        const barcode = generateBarcode(article.articleCode, null);
        const eanCode = generateEan13(artIdx, 0);
        rows.push({
          id: `${article.articleId}-ns`,
          barcode,
          eanCode,
          articleCode: article.articleCode,
          articleName: article.articleName,
          brandName: article.brandName,
          categoryName: article.categoryName,
          segmentName: article.segmentName,
          color: article.color,
          size: "\u2014",
          euroSize: null,
          mrp: article.mrp,
        });
      }
    });
    return rows;
  }, [articles]);

  /* ---- search filter ---- */
  const filteredSkus = useMemo(() => {
    if (!search.trim()) return allSkus;
    const term = search.toLowerCase();
    return allSkus.filter(
      (sku) =>
        sku.articleName.toLowerCase().includes(term) ||
        sku.barcode.toLowerCase().includes(term) ||
        sku.size.toLowerCase().includes(term) ||
        sku.articleCode.toLowerCase().includes(term)
    );
  }, [allSkus, search]);

  /* ---- pagination ---- */
  const totalCount = filteredSkus.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const from = totalCount > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(currentPage * PAGE_SIZE, totalCount);
  const pageData = filteredSkus.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  /* ---- view modal handler ---- */
  const openView = (sku: SkuRow) => {
    setSelectedSku(sku);
    setViewModalOpen(true);
  };

  /* ---- reset page on search ---- */
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">SKUs</h1>
            <p className="text-sm text-muted-foreground">
              Auto-generated Stock Keeping Units with barcodes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">
              <Filter size={14} /> Filter
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search by article name, barcode, size..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {totalCount} SKUs generated
          </span>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Article Code
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Article Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    MRP
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                        Loading articles...
                      </div>
                    </td>
                  </tr>
                ) : pageData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      No SKUs found
                    </td>
                  </tr>
                ) : (
                  pageData.map((sku) => (
                    <tr
                      key={sku.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-primary">
                        {sku.barcode}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {sku.articleCode}
                      </td>
                      <td className="px-4 py-3">{sku.articleName}</td>
                      <td className="px-4 py-3">
                        {sku.euroSize !== null ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                            EU {sku.size}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {sku.size}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(sku.mrp)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openView(sku)}
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          title="View SKU Details"
                        >
                          <Eye
                            size={14}
                            className="text-muted-foreground"
                          />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Rows per page:</span>
              <select className="border rounded px-2 py-1 text-xs">
                <option>25</option>
                <option>50</option>
                <option>100</option>
              </select>
              <span>
                {from}-{to} of {totalCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded hover:bg-muted disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-3">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <span className="font-semibold text-primary">
              Shalive Solutions
            </span>{" "}
            RetailERP
          </p>
        </div>
      </div>

      {/* ---- View SKU Modal ---- */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="SKU Details"
        subtitle="Barcode and product information"
        size="lg"
      >
        {selectedSku && (
          <div className="space-y-6">
            {/* Barcode Visual */}
            <div className="bg-white border rounded-xl p-6 text-center">
              <BarcodeVisual code={selectedSku.eanCode} />
              <p className="font-mono text-lg font-bold tracking-[0.25em] mt-1">
                {selectedSku.barcode}
              </p>
            </div>

            {/* EAN-13 Code */}
            <div className="bg-muted/30 border rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                EAN-13 Code
              </p>
              <p className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">
                {selectedSku.eanCode}
              </p>
            </div>

            {/* Article Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Article Code
                  </p>
                  <p className="font-mono text-sm font-medium mt-0.5">
                    {selectedSku.articleCode}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Article Name
                  </p>
                  <p className="text-sm font-medium mt-0.5">
                    {selectedSku.articleName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Brand
                  </p>
                  <p className="text-sm font-medium mt-0.5">
                    {selectedSku.brandName || "N/A"}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Category
                  </p>
                  <p className="text-sm font-medium mt-0.5">
                    {selectedSku.categoryName || selectedSku.segmentName || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Size
                  </p>
                  <p className="text-sm font-medium mt-0.5">
                    {selectedSku.euroSize !== null
                      ? `EU ${selectedSku.euroSize}`
                      : "Non-size item"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    MRP
                  </p>
                  <p className="text-sm font-semibold text-primary mt-0.5">
                    {formatCurrency(selectedSku.mrp)}
                  </p>
                </div>
              </div>
            </div>

            {/* Close button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
