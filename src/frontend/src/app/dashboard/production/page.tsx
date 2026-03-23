"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import {
  Printer,
  Save,
  CheckCircle,
  Package,
  Search,
  ChevronDown,
  Image as ImageIcon,
  Plus,
} from "lucide-react";

/* ================================================================
   TYPES
   ================================================================ */

interface ProductionOrder {
  productionOrderId: string;
  orderNo: string;
  orderDate: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  colour: string;
  orderType: string;
  totalQuantity: number;
  status: string;
  groupName?: string;
  last?: string;
  upperLeather?: string;
  liningLeather?: string;
  sole?: string;
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  upperCuttingDies?: string;
  materialCuttingDies?: string;
  socksInsoleCuttingDies?: string;
  /** May come back from API as sizeQuantities array or sizes record */
  sizes?: Record<string, number>;
  sizeQuantities?: { euroSize: number; quantity: number }[];
}

interface ArticleOption {
  articleId: string;
  articleCode: string;
  articleName: string;
  colour: string;
  groupName: string;
  last: string;
  upperLeather: string;
  liningLeather: string;
  sole: string;
}

/* ================================================================
   CONSTANTS
   ================================================================ */

// Production sizes matching the PDF: Euro-UK pairs
const PROD_SIZE_LABELS = [
  "39-05", "40-06", "41-07", "42-08", "43-09", "44-10", "45-11", "46-12",
];

const PROD_SIZES = [
  { euroSize: 39, ukSize: "05" },
  { euroSize: 40, ukSize: "06" },
  { euroSize: 41, ukSize: "07" },
  { euroSize: 42, ukSize: "08" },
  { euroSize: 43, ukSize: "09" },
  { euroSize: 44, ukSize: "10" },
  { euroSize: 45, ukSize: "11" },
  { euroSize: 46, ukSize: "12" },
];

/** Map each size label to its euroSize number for the API payload */
const EURO_SIZE_MAP: Record<string, number> = {
  "39-05": 39,
  "40-06": 40,
  "41-07": 41,
  "42-08": 42,
  "43-09": 43,
  "44-10": 44,
  "45-11": 45,
  "46-12": 46,
};

const inputCls =
  "w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 900) + 100).padStart(3, "0");
  return `SKH-${year}-${seq}`;
}

/* ================================================================
   ARTICLE SELECTOR
   ================================================================ */

function ArticleSelector({
  articles,
  selectedId,
  onSelect,
}: {
  articles: ArticleOption[];
  selectedId: string;
  onSelect: (article: ArticleOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = articles.filter(
    (a) =>
      a.articleName.toLowerCase().includes(search.toLowerCase()) ||
      a.articleCode.toLowerCase().includes(search.toLowerCase())
  );

  const selected = articles.find((a) => a.articleId === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 text-sm border rounded-lg hover:bg-muted/50 transition-colors font-medium w-full justify-between"
      >
        {selected ? (
          <span>
            <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-2">
              {selected.articleCode}
            </span>
            {selected.articleName}
            {selected.colour && (
              <span className="text-muted-foreground ml-1">({selected.colour})</span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">Select Article</span>
        )}
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
                  No articles found
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
                    className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0 flex items-center justify-between ${
                      article.articleId === selectedId ? "bg-primary/5" : ""
                    }`}
                  >
                    <div>
                      <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-2">
                        {article.articleCode}
                      </span>
                      <span className="text-sm font-medium">{article.articleName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{article.colour}</span>
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
   HELPER: convert between API sizeQuantities and local formSizes
   ================================================================ */

/** Convert API sizeQuantities array to local Record<sizeLabel, qty> */
function sizeQuantitiesToRecord(
  sizeQuantities?: { euroSize: number; quantity: number }[]
): Record<string, number> {
  if (!sizeQuantities) return {};
  const record: Record<string, number> = {};
  for (const sq of sizeQuantities) {
    const label = PROD_SIZE_LABELS.find(
      (l) => EURO_SIZE_MAP[l] === sq.euroSize
    );
    if (label) {
      record[label] = sq.quantity;
    }
  }
  return record;
}

/** Convert local Record<sizeLabel, qty> to API sizeQuantities array */
function recordToSizeQuantities(
  sizes: Record<string, number>
): { euroSize: number; quantity: number }[] {
  return PROD_SIZE_LABELS.map((label) => ({
    euroSize: EURO_SIZE_MAP[label],
    quantity: sizes[label] || 0,
  }));
}

/* ================================================================
   MAIN PAGE
   ================================================================ */

export default function ProductionPage() {
  /* ---- List state ---- */
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null);

  /* ---- Form state ---- */
  const [formOrderNo, setFormOrderNo] = useState(() => generateOrderNumber());
  const [formOrderDate, setFormOrderDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formOrderType, setFormOrderType] = useState("Fresh");
  const [formArticleId, setFormArticleId] = useState("");
  const [formUpperCuttingDies, setFormUpperCuttingDies] = useState("");
  const [formMaterialCuttingDies, setFormMaterialCuttingDies] = useState("");
  const [formSocksInsoleCuttingDies, setFormSocksInsoleCuttingDies] = useState("");
  const [formPreparedBy, setFormPreparedBy] = useState("");
  const [formCheckedBy, setFormCheckedBy] = useState("");
  const [formApprovedBy, setFormApprovedBy] = useState("");
  const [formSizes, setFormSizes] = useState<Record<string, number>>({});

  /* ---- Reference data ---- */
  const [articles, setArticles] = useState<ArticleOption[]>([]);

  /* ---- UI state ---- */
  const [saving, setSaving] = useState(false);

  /* ---- Fetch production orders: GET /api/production ---- */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/production", {
        params: {
          searchTerm: search || undefined,
          pageNumber: page,
          pageSize: 25,
        },
      });
      if (data.success) {
        const items = data.data?.items || data.data || [];
        setOrders(Array.isArray(items) ? items : []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  /* ---- Fetch articles ---- */
  const fetchArticles = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/articles", {
        params: { pageSize: 500 },
      });
      if (data.success) {
        const items = data.data?.items || data.data || [];
        setArticles(
          items.map((a: any) => ({
            articleId: a.articleId,
            articleCode: a.articleCode,
            articleName: a.articleName,
            colour: a.color || a.colour || "",
            groupName: a.groupName || "",
            last: a.last || "",
            upperLeather: a.upperLeather || "",
            liningLeather: a.liningLeather || "",
            sole: a.sole || "",
          }))
        );
      }
    } catch {
      setArticles([]);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  /* ---- Derived ---- */
  const selectedArticle = articles.find((a) => a.articleId === formArticleId);
  const totalQty = useMemo(
    () => Object.values(formSizes).reduce((sum, q) => sum + (q || 0), 0),
    [formSizes]
  );

  /* ---- Form helpers ---- */
  const setSize = (sizeKey: string, qty: number) => {
    setFormSizes((prev) => ({ ...prev, [sizeKey]: qty }));
  };

  /* ---- CRUD: Open add ---- */
  const openAdd = () => {
    setEditingOrder(null);
    setFormOrderNo(generateOrderNumber());
    setFormOrderDate(new Date().toISOString().split("T")[0]);
    setFormOrderType("Fresh");
    setFormArticleId("");
    setFormUpperCuttingDies("");
    setFormMaterialCuttingDies("");
    setFormSocksInsoleCuttingDies("");
    setFormPreparedBy("");
    setFormCheckedBy("");
    setFormApprovedBy("");
    setFormSizes({});
    setModalOpen(true);
  };

  /* ---- CRUD: Open edit ---- */
  const openEdit = (order: ProductionOrder) => {
    setEditingOrder(order);
    setFormOrderNo(order.orderNo);
    setFormOrderDate(
      order.orderDate
        ? new Date(order.orderDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setFormOrderType(order.orderType || "Fresh");
    setFormArticleId(order.articleId || "");
    setFormUpperCuttingDies(order.upperCuttingDies || "");
    setFormMaterialCuttingDies(order.materialCuttingDies || "");
    setFormSocksInsoleCuttingDies(order.socksInsoleCuttingDies || "");
    setFormPreparedBy(order.preparedBy || "");
    setFormCheckedBy(order.checkedBy || "");
    setFormApprovedBy(order.approvedBy || "");
    // Handle both API shapes: sizeQuantities array or sizes record
    if (order.sizeQuantities && order.sizeQuantities.length > 0) {
      setFormSizes(sizeQuantitiesToRecord(order.sizeQuantities));
    } else {
      setFormSizes(order.sizes || {});
    }
    setModalOpen(true);
  };

  /**
   * Build the payload matching the backend POST /api/production contract:
   * { articleId, color, last, upperLeather, liningLeather, sole, orderType,
   *   upperCuttingDies, materialCuttingDies, socksInsoleCuttingDies,
   *   sizeQuantities: [{ euroSize, quantity }] }
   */
  const buildPayload = useCallback(() => {
    return {
      articleId: formArticleId,
      color: selectedArticle?.colour || "",
      last: selectedArticle?.last || "",
      upperLeather: selectedArticle?.upperLeather || "",
      liningLeather: selectedArticle?.liningLeather || "",
      sole: selectedArticle?.sole || "",
      orderType: formOrderType,
      upperCuttingDies: formUpperCuttingDies || undefined,
      materialCuttingDies: formMaterialCuttingDies || undefined,
      socksInsoleCuttingDies: formSocksInsoleCuttingDies || undefined,
      sizeQuantities: recordToSizeQuantities(formSizes),
    };
  }, [
    formArticleId,
    selectedArticle,
    formOrderType,
    formUpperCuttingDies,
    formMaterialCuttingDies,
    formSocksInsoleCuttingDies,
    formSizes,
  ]);

  /* ---- CRUD: Save as Draft -- POST /api/production ---- */
  const handleSaveDraft = async () => {
    if (!formArticleId) {
      alert("Please select an article.");
      return;
    }
    if (totalQty <= 0) {
      alert("Please enter size-wise quantities.");
      return;
    }
    setSaving(true);
    try {
      const body = buildPayload();
      if (editingOrder) {
        await api.put(
          `/api/production/${editingOrder.productionOrderId}`,
          body
        );
      } else {
        await api.post("/api/production", body);
      }
      setModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      alert(
        err.response?.data?.message || "Failed to save production order"
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---- CRUD: Save then Approve -- POST then PUT /api/production/{id}/approve ---- */
  const handleApprove = async () => {
    if (!formArticleId) {
      alert("Please select an article.");
      return;
    }
    if (totalQty <= 0) {
      alert("Please enter size-wise quantities.");
      return;
    }
    setSaving(true);
    try {
      const body = buildPayload();
      let orderId = editingOrder?.productionOrderId;

      if (editingOrder) {
        await api.put(`/api/production/${orderId}`, body);
      } else {
        const { data } = await api.post<ApiResponse<any>>(
          "/api/production",
          body
        );
        if (data.success && data.data) {
          orderId =
            data.data.productionOrderId || data.data.id;
        } else {
          throw new Error(
            data.message || "Failed to create production order"
          );
        }
      }

      // Now approve via dedicated endpoint
      if (orderId) {
        await api.put(`/api/production/${orderId}/approve`);
      }

      setModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          err.message ||
          "Failed to approve production order"
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---- CRUD: Delete ---- */
  const handleDelete = async (order: ProductionOrder) => {
    if (!confirm(`Delete production order "${order.orderNo}"?`)) return;
    try {
      await api.delete(
        `/api/production/${order.productionOrderId}`
      );
      fetchOrders();
    } catch (err: any) {
      alert(
        err.response?.data?.message || "Failed to delete production order"
      );
    }
  };

  /* ---- Status actions from list view using dedicated endpoints ---- */
  const handleApproveFromList = async (order: ProductionOrder) => {
    try {
      await api.put(
        `/api/production/${order.productionOrderId}/approve`
      );
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to approve order");
    }
  };

  const handleStartFromList = async (order: ProductionOrder) => {
    try {
      await api.put(
        `/api/production/${order.productionOrderId}/start`
      );
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to start order");
    }
  };

  const handleCompleteFromList = async (order: ProductionOrder) => {
    try {
      await api.put(
        `/api/production/${order.productionOrderId}/complete`
      );
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to complete order");
    }
  };

  /* ---- Print handler ---- */
  const handlePrint = () => {
    window.print();
  };

  /* ---- Columns ---- */
  const columns: Column<ProductionOrder>[] = [
    {
      key: "orderNo",
      header: "Order No",
      className: "font-mono text-xs font-medium whitespace-nowrap",
    },
    {
      key: "orderDate",
      header: "Order Date",
      render: (o) => formatDate(o.orderDate),
    },
    {
      key: "articleCode",
      header: "Article",
      render: (o) => (
        <div>
          <span className="font-mono text-xs">{o.articleCode}</span>
          <span className="text-xs text-muted-foreground ml-1">{o.articleName}</span>
        </div>
      ),
    },
    { key: "groupName", header: "Group" },
    { key: "last", header: "Last" },
    {
      key: "colour",
      header: "Colour",
      render: (o) => o.colour || "-",
    },
    {
      key: "upperLeather",
      header: "Upper Leather",
      render: (o) => o.upperLeather || "-",
    },
    {
      key: "liningLeather",
      header: "Lining Leather",
      render: (o) => o.liningLeather || "-",
    },
    {
      key: "sole",
      header: "Sole",
      render: (o) => o.sole || "-",
    },
    {
      key: "totalQuantity",
      header: "Total Qty",
      className: "text-right font-medium",
    },
    {
      key: "status",
      header: "Status",
      render: (o) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={o.status} />
          {o.status === "DRAFT" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleApproveFromList(o);
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              Approve
            </button>
          )}
          {o.status === "APPROVED" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartFromList(o);
              }}
              className="text-xs text-yellow-600 hover:underline"
            >
              Start
            </button>
          )}
          {o.status === "IN_PROGRESS" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCompleteFromList(o);
              }}
              className="text-xs text-green-600 hover:underline"
            >
              Complete
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="Production Orders"
        subtitle="Size-wise production order with material specifications"
        columns={columns}
        data={orders}
        totalCount={totalCount}
        pageNumber={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        onImport={() => alert("Import feature coming soon")}
        onExport={() => alert("Export feature coming soon")}
        addLabel="New Production Order"
        loading={loading}
        keyExtractor={(o) => o.productionOrderId}
      />

      {/* ========== PRODUCTION ORDER MODAL (XL) ========== */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingOrder ? "Edit Production Order" : "New Production Order"}
        subtitle={
          editingOrder
            ? `Editing ${editingOrder.orderNo}`
            : "Production Order Request Form -- Size-wise entry"
        }
        size="xl"
      >
        <div className="space-y-5">
          {/* ---- Header Row: Order No, Date, Type ---- */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/20 rounded-xl border">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Order No
              </label>
              <input
                type="text"
                value={formOrderNo}
                readOnly
                className={`${inputCls} bg-muted/50 cursor-not-allowed font-mono font-semibold`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Order Date
              </label>
              <input
                type="date"
                value={formOrderDate}
                onChange={(e) => setFormOrderDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Order Type *
              </label>
              <select
                value={formOrderType}
                onChange={(e) => setFormOrderType(e.target.value)}
                className={inputCls}
              >
                <option value="Replenishment">Replenishment</option>
                <option value="Fresh">Fresh</option>
                <option value="Sample">Sample</option>
              </select>
            </div>
          </div>

          {/* ---- Cutting Dies Row ---- */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Upper Cutting Dies
              </label>
              <input
                type="text"
                value={formUpperCuttingDies}
                onChange={(e) => setFormUpperCuttingDies(e.target.value)}
                placeholder="Enter upper cutting dies"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Material Cutting Dies
              </label>
              <input
                type="text"
                value={formMaterialCuttingDies}
                onChange={(e) => setFormMaterialCuttingDies(e.target.value)}
                placeholder="Enter material cutting dies"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Socks/Insole Cutting Dies
              </label>
              <input
                type="text"
                value={formSocksInsoleCuttingDies}
                onChange={(e) => setFormSocksInsoleCuttingDies(e.target.value)}
                placeholder="Enter socks/insole cutting dies"
                className={inputCls}
              />
            </div>
          </div>

          {/* ---- Article Selection + Image Area ---- */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Article *
              </label>
              <ArticleSelector
                articles={articles}
                selectedId={formArticleId}
                onSelect={(a) => setFormArticleId(a.articleId)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Article Image
              </label>
              <div className="border-2 border-dashed rounded-lg h-24 flex items-center justify-center text-muted-foreground bg-muted/20">
                <div className="text-center">
                  <ImageIcon size={24} className="mx-auto mb-1 opacity-40" />
                  <span className="text-xs">Image placeholder</span>
                </div>
              </div>
            </div>
          </div>

          {/* ---- Article Details Table ---- */}
          {selectedArticle && (
            <div className="border rounded-xl overflow-hidden">
              <div className="text-center py-2 bg-muted/30 border-b">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Article Details
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/20 border-b">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Group</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Last</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Article</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Colour</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Upper Leather</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Lining Leather</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Sole</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-3 py-2.5 font-medium">{selectedArticle.groupName || "-"}</td>
                      <td className="px-3 py-2.5 font-medium">{selectedArticle.last || "-"}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-1">
                          {selectedArticle.articleCode}
                        </span>
                        <span className="font-medium">{selectedArticle.articleName}</span>
                      </td>
                      <td className="px-3 py-2.5 font-medium">{selectedArticle.colour || "-"}</td>
                      <td className="px-3 py-2.5 font-medium">{selectedArticle.upperLeather || "-"}</td>
                      <td className="px-3 py-2.5 font-medium">{selectedArticle.liningLeather || "-"}</td>
                      <td className="px-3 py-2.5 font-medium">{selectedArticle.sole || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---- Size Run Table (Production) ---- */}
          <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="text-center py-2 bg-muted/30 border-b">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Production Size Run
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-3 py-2 text-left font-bold text-primary border-r border-border/50 w-28 whitespace-nowrap">
                      SIZE
                    </th>
                    {PROD_SIZE_LABELS.map((label, idx) => (
                      <th
                        key={idx}
                        className="px-2 py-2 text-center font-bold text-primary border-r border-border/50 whitespace-nowrap"
                      >
                        {label}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-bold text-primary whitespace-nowrap w-20">
                      TOTAL QNTY
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Euro Size Row */}
                  <tr className="border-b border-border/30">
                    <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50">
                      EURO SIZE
                    </td>
                    {PROD_SIZES.map((s, idx) => (
                      <td key={idx} className="px-2 py-1.5 text-center border-r border-border/50">
                        {s.euroSize}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-center" />
                  </tr>
                  {/* UK Size Row */}
                  <tr className="border-b border-border/30">
                    <td className="px-3 py-1.5 font-semibold text-muted-foreground border-r border-border/50">
                      UK SIZE
                    </td>
                    {PROD_SIZES.map((s, idx) => (
                      <td key={idx} className="px-2 py-1.5 text-center border-r border-border/50">
                        {s.ukSize}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-center" />
                  </tr>
                  {/* Quantity Row (editable, orange) */}
                  <tr>
                    <td className="px-3 py-2 font-bold text-foreground border-r border-border/50 bg-amber-50">
                      QUANTITY
                    </td>
                    {PROD_SIZE_LABELS.map((label, idx) => (
                      <td
                        key={idx}
                        className="px-1 py-1.5 text-center border-r border-border/50 bg-amber-50"
                      >
                        <input
                          type="number"
                          min="0"
                          value={formSizes[label] || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setSize(label, val < 0 ? 0 : val);
                          }}
                          className="w-full px-1 py-1.5 text-center text-sm font-bold bg-amber-100 border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-center font-bold text-lg bg-amber-50">
                      {totalQty}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total Footer */}
            <div className="flex items-center justify-between px-5 py-3 bg-muted/20 border-t">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  TOTAL QNTY:{" "}
                  <span className="font-bold text-foreground text-base">{totalQty}</span>
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                Order Type:{" "}
                <span className="font-bold text-foreground">{formOrderType}</span>
              </span>
            </div>
          </div>

          {/* ---- Prepared / Checked / Approved ---- */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/20 rounded-xl border">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Prepared By
              </label>
              <input
                type="text"
                value={formPreparedBy}
                onChange={(e) => setFormPreparedBy(e.target.value)}
                placeholder="Name"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Checked By
              </label>
              <input
                type="text"
                value={formCheckedBy}
                onChange={(e) => setFormCheckedBy(e.target.value)}
                placeholder="Name"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Approved By
              </label>
              <input
                type="text"
                value={formApprovedBy}
                onChange={(e) => setFormApprovedBy(e.target.value)}
                placeholder="Name"
                className={inputCls}
              />
            </div>
          </div>

          {/* ---- Status Workflow Info ---- */}
          {editingOrder && (
            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border text-xs">
              <span className="text-muted-foreground font-medium">Status Workflow:</span>
              {["DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED"].map((s, idx) => (
                <span key={s} className="flex items-center gap-1">
                  <span
                    className={`px-2 py-0.5 rounded font-medium ${
                      editingOrder.status === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.replace("_", " ")}
                  </span>
                  {idx < 3 && <span className="text-muted-foreground">&#8594;</span>}
                </span>
              ))}
            </div>
          )}

          {/* ---- Action Buttons ---- */}
          <div className="flex justify-between gap-3 pt-2 border-t">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
            >
              <Printer size={14} />
              Print Production Order
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 text-sm border rounded-lg hover:bg-muted transition-colors font-medium disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save as Draft"}
              </button>
              <button
                onClick={handleApprove}
                disabled={saving}
                className="flex items-center gap-1.5 px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50 shadow-sm"
              >
                <CheckCircle size={14} />
                {editingOrder ? "Update & Approve" : "Create & Approve"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
