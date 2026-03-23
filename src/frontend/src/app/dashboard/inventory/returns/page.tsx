"use client";

import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Package, AlertCircle, CheckCircle2 } from "lucide-react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";

interface ReturnRecord {
  returnId: string;
  returnNumber: string;
  returnDate: string;
  warehouseName: string;
  clientName: string;
  storeName: string;
  totalQuantity: number;
  lineCount: number;
  reason: string;
  status: string;
  createdAt: string;
}

interface ReturnLine {
  returnLineId: string;
  articleCode: string;
  articleName: string;
  color: string;
  euroSize: string;
  quantity: number;
}

interface ReturnDetail extends ReturnRecord {
  notes: string;
  lines: ReturnLine[];
}

interface Warehouse {
  warehouseId: string;
  warehouseName: string;
}

interface Client {
  clientId: string;
  clientName: string;
}

interface Store {
  storeId: string;
  storeName: string;
  clientId: string;
}

interface Article {
  articleId: string;
  articleName: string;
  articleCode: string;
}

interface SizeStock {
  euroSize: string;
  closingStock: number;
}

interface LineItem {
  articleId: string;
  articleName: string;
  euroSize: string;
  quantity: number;
}

// Status flow: Received -> Inspected -> Restocked | Rejected
const STATUS_COLORS: Record<string, string> = {
  Received: "bg-blue-100 text-blue-700",
  Inspected: "bg-yellow-100 text-yellow-700",
  Restocked: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
};

const NEXT_STATUSES: Record<string, string[]> = {
  Received: ["Inspected", "Rejected"],
  Inspected: ["Restocked", "Rejected"],
};

const REASON_COLORS: Record<string, string> = {
  Defective: "bg-red-100 text-red-700",
  "Wrong Item": "bg-orange-100 text-orange-700",
  "Customer Return": "bg-blue-100 text-blue-700",
  "Excess Stock": "bg-purple-100 text-purple-700",
  "Quality Issue": "bg-yellow-100 text-yellow-700",
  Other: "bg-gray-100 text-gray-700",
};

const RETURN_REASONS = [
  "Defective",
  "Wrong Item",
  "Customer Return",
  "Excess Stock",
  "Quality Issue",
  "Other",
];

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewDetail, setViewDetail] = useState<ReturnDetail | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dropdown data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [sizeStocks, setSizeStocks] = useState<SizeStock[]>([]);

  // Form state
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formStoreId, setFormStoreId] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Line item state
  const [lines, setLines] = useState<LineItem[]>([]);
  const [addingLine, setAddingLine] = useState(false);
  const [lineArticleId, setLineArticleId] = useState("");
  const [lineSize, setLineSize] = useState("");
  const [lineQty, setLineQty] = useState("");
  const [saving, setSaving] = useState(false);

  // Status update state (used in view modal)
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");

  const filteredStores = stores.filter(
    (s) => !formClientId || s.clientId === formClientId
  );
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/stock/returns", {
        params: {
          search: search || undefined,
          pageNumber: page,
          pageSize: 25,
        },
      });
      if (data.success) {
        setReturns(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [wh, cl, st, ar] = await Promise.all([
          api.get<ApiResponse<any>>("/api/warehouses", {
            params: { pageSize: 200 },
          }),
          api.get<ApiResponse<any>>("/api/clients", {
            params: { pageSize: 200 },
          }),
          api.get<ApiResponse<any>>("/api/stores", {
            params: { pageSize: 500 },
          }),
          api.get<ApiResponse<any>>("/api/articles", {
            params: { pageSize: 200 },
          }),
        ]);
        if (wh.data.success) setWarehouses(wh.data.data?.items || []);
        if (cl.data.success) setClients(cl.data.data?.items || []);
        if (st.data.success) setStores(st.data.data?.items || []);
        if (ar.data.success) setArticles(ar.data.data?.items || []);
      } catch {
        // silently fail
      }
    };
    loadDropdowns();
  }, []);

  // Fetch size-wise stock when warehouse + article are both selected
  // For returns, we show ALL sizes (not just those with stock > 0) since
  // returns are inward movements that add to stock.
  useEffect(() => {
    if (!formWarehouseId || !lineArticleId) {
      setSizeStocks([]);
      return;
    }
    api
      .get<ApiResponse<any>>(
        `/api/stock/warehouse/${formWarehouseId}/article/${lineArticleId}`
      )
      .then(({ data }) => {
        if (data.success) setSizeStocks(data.data?.sizeStock || []);
      })
      .catch(() => setSizeStocks([]));
  }, [formWarehouseId, lineArticleId]);

  const addLine = () => {
    if (!lineArticleId || !lineSize || !lineQty || parseInt(lineQty) <= 0)
      return;
    const art = articles.find((a) => a.articleId === lineArticleId);
    setLines((prev) => [
      ...prev,
      {
        articleId: lineArticleId,
        articleName: art
          ? `${art.articleCode} — ${art.articleName}`
          : lineArticleId,
        euroSize: lineSize,
        quantity: parseInt(lineQty),
      },
    ]);
    setLineSize("");
    setLineQty("");
    setAddingLine(false);
  };

  const removeLine = (idx: number) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  const resetForm = () => {
    setFormWarehouseId("");
    setFormClientId("");
    setFormStoreId("");
    setFormReason("");
    setFormNotes("");
    setLines([]);
    setLineArticleId("");
    setLineSize("");
    setLineQty("");
    setError("");
  };

  const openAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleView = async (r: ReturnRecord) => {
    try {
      const { data } = await api.get<ApiResponse<ReturnDetail>>(
        `/api/stock/returns/${r.returnId}`
      );
      if (data.success && data.data) {
        setViewDetail(data.data);
        setPendingStatus("");
        setViewModal(true);
      }
    } catch {
      // view fails silently
    }
  };

  const handleSave = async () => {
    setError("");
    if (!formWarehouseId) {
      setError("Please select a warehouse.");
      return;
    }
    if (!formReason) {
      setError("Please select a return reason.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one line item.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/stock/returns", {
        warehouseId: formWarehouseId,
        clientId: formClientId || undefined,
        storeId: formStoreId || undefined,
        reason: formReason,
        notes: formNotes || undefined,
        lines: lines.map((l) => ({
          articleId: l.articleId,
          euroSize: l.euroSize,
          quantity: l.quantity,
        })),
      });
      setSuccess("Return recorded successfully.");
      setModalOpen(false);
      fetchReturns();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save return.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!viewDetail || !pendingStatus) return;
    setStatusUpdating(true);
    try {
      await api.put(`/api/stock/returns/${viewDetail.returnId}/status`, {
        status: pendingStatus,
      });
      setSuccess(`Return status updated to "${pendingStatus}".`);
      setViewModal(false);
      fetchReturns();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const canUpdateStatus =
    viewDetail &&
    NEXT_STATUSES[viewDetail.status] !== undefined &&
    NEXT_STATUSES[viewDetail.status].length > 0;

  const columns: Column<ReturnRecord>[] = [
    {
      key: "returnNumber",
      header: "Return No",
      className: "font-mono text-xs font-semibold text-primary",
    },
    {
      key: "returnDate",
      header: "Date",
      render: (r) => formatDate(r.returnDate),
    },
    { key: "warehouseName", header: "Warehouse" },
    {
      key: "clientName",
      header: "Client",
      render: (r) => r.clientName || "—",
    },
    {
      key: "reason",
      header: "Reason",
      render: (r) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            REASON_COLORS[r.reason] || "bg-gray-100 text-gray-700"
          }`}
        >
          {r.reason}
        </span>
      ),
    },
    {
      key: "totalQuantity",
      header: "Total Qty",
      className: "text-right font-semibold",
      render: (r) => (
        <span>{r.totalQuantity.toLocaleString("en-IN")}</span>
      ),
    },
    {
      key: "lineCount",
      header: "Lines",
      className: "text-center",
      render: (r) => (
        <span className="px-2 py-0.5 rounded-full bg-muted text-xs">
          {r.lineCount}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            STATUS_COLORS[r.status] || "bg-gray-100 text-gray-700"
          }`}
        >
          {r.status === "Restocked" && <CheckCircle2 size={10} />}
          {r.status}
        </span>
      ),
    },
  ];

  return (
    <>
      {success && (
        <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{success}</span>
          <button
            onClick={() => setSuccess("")}
            className="ml-auto text-green-500 hover:text-green-700 font-medium"
          >
            ✕
          </button>
        </div>
      )}

      <DataTable
        title="Returns Processing"
        subtitle="Record and process inward stock returns from clients and stores"
        columns={columns}
        data={returns}
        totalCount={totalCount}
        pageNumber={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={openAdd}
        onEdit={handleView}
        onExport={() => {}}
        addLabel="New Return"
        loading={loading}
        keyExtractor={(r) => r.returnId}
      />

      {/* Add Return Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Return"
        subtitle="Record an inward stock return"
        size="xl"
      >
        <div className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Warehouse + Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                value={formWarehouseId}
                onChange={(e) => setFormWarehouseId(e.target.value)}
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.warehouseName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Client</label>
              <select
                value={formClientId}
                onChange={(e) => {
                  setFormClientId(e.target.value);
                  setFormStoreId("");
                }}
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              >
                <option value="">Select Client (optional)</option>
                {clients.map((c) => (
                  <option key={c.clientId} value={c.clientId}>
                    {c.clientName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Store + Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Store</label>
              <select
                value={formStoreId}
                onChange={(e) => setFormStoreId(e.target.value)}
                disabled={!formClientId}
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm disabled:opacity-50"
              >
                <option value="">
                  {formClientId ? "Select Store" : "Select client first"}
                </option>
                {filteredStores.map((s) => (
                  <option key={s.storeId} value={s.storeId}>
                    {s.storeName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Return Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              >
                <option value="">Select Reason</option>
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                Line Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAddingLine(true)}
                className="text-xs text-primary hover:underline font-medium"
              >
                + Add Item
              </button>
            </div>

            {/* Inline add-line row */}
            {addingLine && (
              <div className="mb-3 p-3 bg-muted/30 border rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Article *
                  </label>
                  <select
                    value={lineArticleId}
                    onChange={(e) => {
                      setLineArticleId(e.target.value);
                      setLineSize("");
                    }}
                    className="w-full px-2 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select Article</option>
                    {articles.map((a) => (
                      <option key={a.articleId} value={a.articleId}>
                        {a.articleCode} — {a.articleName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Size *
                  </label>
                  <select
                    value={lineSize}
                    onChange={(e) => setLineSize(e.target.value)}
                    disabled={!lineArticleId || !formWarehouseId}
                    className="w-full px-2 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  >
                    <option value="">Select Size</option>
                    {/* Returns add to stock, so show all available sizes */}
                    {sizeStocks.map((s) => (
                      <option key={s.euroSize} value={s.euroSize}>
                        Size {s.euroSize}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Qty *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lineQty}
                    onChange={(e) => setLineQty(e.target.value)}
                    className="w-full px-2 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addLine}
                    className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAddingLine(false)}
                    className="px-3 py-2 border rounded-lg text-sm hover:bg-muted"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Lines table */}
            {lines.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                        Article
                      </th>
                      <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">
                        Size
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">
                        Return Qty
                      </th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 font-medium text-xs">
                          {l.articleName}
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-xs">
                          {l.euroSize}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-xs">
                          {l.quantity}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removeLine(i)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t bg-muted/30 font-semibold">
                      <td colSpan={2} className="px-3 py-2 text-sm">
                        Total
                      </td>
                      <td className="px-3 py-2 text-right text-sm">
                        {totalQty}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                <Package size={24} className="mx-auto mb-2 opacity-40" />
                No line items yet. Click "+ Add Item" above.
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={2}
              placeholder="Additional details about this return..."
              className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <RotateCcw size={14} />
                  Record Return
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Detail Modal */}
      {viewDetail && (
        <Modal
          isOpen={viewModal}
          onClose={() => setViewModal(false)}
          title={`Return: ${viewDetail.returnNumber}`}
          subtitle={`${viewDetail.warehouseName} • ${formatDate(viewDetail.returnDate)}`}
          size="xl"
        >
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Status",
                  value: (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[viewDetail.status] ||
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {viewDetail.status}
                    </span>
                  ),
                },
                {
                  label: "Reason",
                  value: (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        REASON_COLORS[viewDetail.reason] ||
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {viewDetail.reason}
                    </span>
                  ),
                },
                {
                  label: "Client",
                  value: viewDetail.clientName || "—",
                },
                {
                  label: "Store",
                  value: viewDetail.storeName || "—",
                },
              ].map((f) => (
                <div key={f.label} className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="font-medium text-sm mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>

            {/* Line items table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                      Article
                    </th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">
                      Size
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {viewDetail.lines?.map((l, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 text-xs">
                        {l.articleCode} — {l.articleName}
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-xs">
                        {l.euroSize}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-xs">
                        {l.quantity}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td colSpan={2} className="px-3 py-2 text-sm">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-sm">
                      {viewDetail.lines?.reduce(
                        (sum, l) => sum + l.quantity,
                        0
                      ) ?? 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {viewDetail.notes && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{viewDetail.notes}</p>
              </div>
            )}

            {/* Status update panel — shown only when transitions are possible */}
            {canUpdateStatus && (
              <div className="border border-dashed rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Update Status</p>
                <p className="text-xs text-muted-foreground">
                  Current status: <strong>{viewDetail.status}</strong>. Select
                  the next status to advance this return.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={pendingStatus}
                    onChange={(e) => setPendingStatus(e.target.value)}
                    className="flex-1 px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select new status</option>
                    {NEXT_STATUSES[viewDetail.status]?.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={!pendingStatus || statusUpdating}
                    className="flex items-center justify-center gap-2 px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 whitespace-nowrap"
                  >
                    {statusUpdating ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                        Updating...
                      </>
                    ) : (
                      "Apply Status"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
