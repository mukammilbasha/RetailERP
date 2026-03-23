"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, Play, AlertCircle, FileText, Clock, Package } from "lucide-react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";

type AdjStatus = "Draft" | "Approved" | "Applied" | "Rejected";
type AdjType = "Add" | "Remove";

interface AdjRecord {
  adjustmentId: string;
  adjustmentNumber: string;
  adjustmentDate: string;
  adjustmentType: AdjType;
  reason: string;
  status: AdjStatus;
  totalQuantity: number;
  lineCount: number;
  warehouseName: string;
  approvedAt?: string;
  appliedAt?: string;
  createdAt: string;
}

interface AdjDetail extends AdjRecord {
  notes: string;
  lines: { articleCode: string; articleName: string; euroSize: string; quantity: number }[];
}

interface Warehouse { warehouseId: string; warehouseName: string; }
interface Article { articleId: string; articleName: string; articleCode: string; }
interface SizeStock { euroSize: string; closingStock: number; }

const STATUS_CONFIG: Record<AdjStatus, { color: string; icon: React.ReactNode; label: string }> = {
  Draft: { color: "bg-gray-100 text-gray-700", icon: <FileText size={10} />, label: "Draft" },
  Approved: { color: "bg-blue-100 text-blue-700", icon: <CheckCircle2 size={10} />, label: "Approved" },
  Applied: { color: "bg-green-100 text-green-700", icon: <Play size={10} />, label: "Applied" },
  Rejected: { color: "bg-red-100 text-red-700", icon: <XCircle size={10} />, label: "Rejected" },
};

const REASONS = ["Damaged", "Lost", "Found", "Correction", "Physical Verification", "System Error", "Other"];

interface LineItem { articleId: string; articleName: string; euroSize: string; quantity: number; availableStock: number; }

export default function StockAdjustmentPage() {
  const [adjustments, setAdjustments] = useState<AdjRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewDetail, setViewDetail] = useState<AdjDetail | null>(null);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectModal, setRejectModal] = useState(false);

  // Dropdowns
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [sizeStocks, setSizeStocks] = useState<SizeStock[]>([]);

  // Form
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [formType, setFormType] = useState<AdjType>("Add");
  const [formReason, setFormReason] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [addingLine, setAddingLine] = useState(false);
  const [lineArticleId, setLineArticleId] = useState("");
  const [lineSize, setLineSize] = useState("");
  const [lineQty, setLineQty] = useState("");
  const [saving, setSaving] = useState(false);

  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);

  const fetchAdjustments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/stock/adjustments", {
        params: { search: search || undefined, pageNumber: page, pageSize: 25, status: statusFilter || undefined },
      });
      if (data.success) {
        setAdjustments(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setAdjustments([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchAdjustments(); }, [fetchAdjustments]);

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<any>>("/api/warehouses", { params: { pageSize: 200 } }),
      api.get<ApiResponse<any>>("/api/articles", { params: { pageSize: 200 } }),
    ]).then(([wh, ar]) => {
      if (wh.data.success) setWarehouses(wh.data.data?.items || []);
      if (ar.data.success) setArticles(ar.data.data?.items || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!formWarehouseId || !lineArticleId) { setSizeStocks([]); return; }
    api.get<ApiResponse<any>>(`/api/stock/warehouse/${formWarehouseId}/article/${lineArticleId}`)
      .then(({ data }) => { if (data.success) setSizeStocks(data.data?.sizeStock || []); })
      .catch(() => setSizeStocks([]));
  }, [formWarehouseId, lineArticleId]);

  const addLine = () => {
    if (!lineArticleId || !lineSize || !lineQty || parseInt(lineQty) <= 0) return;
    const art = articles.find(a => a.articleId === lineArticleId);
    const stock = sizeStocks.find(s => s.euroSize === lineSize);
    setLines(prev => [...prev, {
      articleId: lineArticleId,
      articleName: art ? `${art.articleCode} — ${art.articleName}` : lineArticleId,
      euroSize: lineSize,
      quantity: parseInt(lineQty),
      availableStock: stock?.closingStock ?? 0,
    }]);
    setLineSize(""); setLineQty(""); setAddingLine(false);
  };

  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const resetForm = () => {
    setFormWarehouseId(""); setFormType("Add"); setFormReason(""); setFormNotes("");
    setLines([]); setLineArticleId(""); setLineSize(""); setLineQty(""); setError("");
  };

  const handleView = async (adj: AdjRecord) => {
    try {
      const { data } = await api.get<ApiResponse<AdjDetail>>(`/api/stock/adjustments/${adj.adjustmentId}`);
      if (data.success) {
        setViewDetail(data.data!);
        setViewModal(true);
      } else {
        setViewDetail({ ...adj, notes: "", lines: [] });
        setViewModal(true);
      }
    } catch {
      setViewDetail({ ...adj, notes: "", lines: [] });
      setViewModal(true);
    }
  };

  const handleApprove = async () => {
    if (!viewDetail) return;
    setActionLoading(true);
    try {
      await api.put(`/api/stock/adjustments/${viewDetail.adjustmentId}/approve`);
      setViewDetail(prev => prev ? { ...prev, status: "Approved" } : null);
      fetchAdjustments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!viewDetail || !rejectReason) return;
    setActionLoading(true);
    try {
      await api.put(`/api/stock/adjustments/${viewDetail.adjustmentId}/reject`, { reason: rejectReason });
      setViewDetail(prev => prev ? { ...prev, status: "Rejected" } : null);
      setRejectModal(false);
      setRejectReason("");
      fetchAdjustments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApply = async () => {
    if (!viewDetail) return;
    if (!window.confirm("Apply adjustment to stock? This will update stock levels.")) return;
    setActionLoading(true);
    try {
      await api.post(`/api/stock/adjustments/${viewDetail.adjustmentId}/apply`);
      setViewDetail(prev => prev ? { ...prev, status: "Applied" } : null);
      fetchAdjustments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to apply adjustment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async () => {
    setError("");
    if (!formWarehouseId) { setError("Select a warehouse."); return; }
    if (!formReason) { setError("Select a reason."); return; }
    if (lines.length === 0) { setError("Add at least one line item."); return; }
    if (formType === "Remove") {
      const overAllocated = lines.filter(l => l.quantity > l.availableStock);
      if (overAllocated.length > 0) {
        setError(`Insufficient stock for removal: ${overAllocated.map(l => `${l.articleName} (${l.euroSize})`).join(", ")}`);
        return;
      }
    }
    setSaving(true);
    try {
      await api.post("/api/stock/adjustments", {
        warehouseId: formWarehouseId,
        adjustmentType: formType,
        reason: formReason,
        notes: formNotes || undefined,
        lines: lines.map(l => ({ articleId: l.articleId, euroSize: l.euroSize, quantity: l.quantity })),
      });
      setModalOpen(false);
      fetchAdjustments();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save adjustment");
    } finally {
      setSaving(false);
    }
  };

  // Status Flow Banner
  const StatusFlow = ({ current }: { current: AdjStatus }) => {
    const steps: AdjStatus[] = ["Draft", "Approved", "Applied"];
    return (
      <div className="flex items-center gap-1">
        {steps.map((s, i) => {
          const isActive = s === current;
          const isPast = steps.indexOf(current) > i;
          const isRejected = current === "Rejected";
          return (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                isRejected && s === "Draft" ? "bg-red-100 text-red-700" :
                isActive ? "bg-primary text-primary-foreground" :
                isPast ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
              }`}>
                {isPast && !isRejected ? <CheckCircle2 size={10} /> : STATUS_CONFIG[s]?.icon}
                {isRejected && s === "Draft" ? "Rejected" : s}
              </div>
              {i < steps.length - 1 && (
                <div className={`mx-1 h-0.5 w-4 ${isPast ? "bg-green-400" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const columns: Column<AdjRecord>[] = [
    { key: "adjustmentNumber", header: "Adj. No", className: "font-mono text-xs font-semibold text-primary" },
    { key: "adjustmentDate", header: "Date", render: a => formatDate(a.adjustmentDate) },
    { key: "warehouseName", header: "Warehouse" },
    {
      key: "adjustmentType",
      header: "Type",
      render: a => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.adjustmentType === "Add" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {a.adjustmentType === "Add" ? "▲ Add" : "▼ Remove"}
        </span>
      ),
    },
    { key: "reason", header: "Reason" },
    {
      key: "totalQuantity",
      header: "Qty",
      className: "text-right font-semibold",
      render: a => <span>{a.totalQuantity.toLocaleString("en-IN")}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: a => {
        const cfg = STATUS_CONFIG[a.status];
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
            {cfg.icon}{cfg.label}
          </span>
        );
      },
    },
  ];

  return (
    <>
      {/* Status filter tabs */}
      <div className="px-6 pt-4 flex gap-2 flex-wrap">
        {(["", "Draft", "Approved", "Applied", "Rejected"] as const).map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
          >
            {s === "" ? "All" : s}
          </button>
        ))}
      </div>

      <DataTable
        title="Stock Adjustment"
        subtitle="Add or remove stock for corrections, damages, and discrepancies"
        columns={columns}
        data={adjustments}
        totalCount={totalCount}
        pageNumber={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={() => { resetForm(); setModalOpen(true); }}
        onEdit={handleView}
        onExport={() => {}}
        addLabel="+ New Adjustment"
        loading={loading}
        keyExtractor={a => a.adjustmentId}
      />

      {/* Create Adjustment Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Stock Adjustment"
        subtitle="Creates a Draft — requires approval before applying"
        size="xl"
      >
        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />{error}
            </div>
          )}

          {/* Info banner */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <Clock size={14} />
            <span>Adjustments are created as <strong>Draft</strong> and must be approved before they affect stock.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Warehouse <span className="text-red-500">*</span></label>
              <select
                value={formWarehouseId}
                onChange={e => setFormWarehouseId(e.target.value)}
                className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(w => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Adjustment Type <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                {(["Add", "Remove"] as AdjType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormType(t)}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                      formType === t
                        ? (t === "Add" ? "bg-green-600 text-white border-green-600" : "bg-red-600 text-white border-red-600")
                        : "hover:bg-muted"
                    }`}
                  >
                    {t === "Add" ? "▲ Add Stock" : "▼ Remove Stock"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Reason <span className="text-red-500">*</span></label>
            <select
              value={formReason}
              onChange={e => setFormReason(e.target.value)}
              className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select Reason</option>
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Items <span className="text-red-500">*</span></label>
              <button onClick={() => setAddingLine(true)} className="text-xs text-primary hover:underline font-medium">+ Add Item</button>
            </div>
            {addingLine && (
              <div className="mb-3 p-3 bg-muted/30 border rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Article</label>
                  <select
                    value={lineArticleId}
                    onChange={e => { setLineArticleId(e.target.value); setLineSize(""); }}
                    className="w-full px-2 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Article</option>
                    {articles.map(a => (
                      <option key={a.articleId} value={a.articleId}>{a.articleCode} — {a.articleName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Size</label>
                  <select
                    value={lineSize}
                    onChange={e => setLineSize(e.target.value)}
                    disabled={!lineArticleId || !formWarehouseId}
                    className="w-full px-2 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  >
                    <option value="">Select Size</option>
                    {(formType === "Remove" ? sizeStocks.filter(s => s.closingStock > 0) : sizeStocks).map(s => (
                      <option key={s.euroSize} value={s.euroSize}>
                        {s.euroSize} {formType === "Remove" ? `(Avl: ${s.closingStock})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={lineQty}
                    onChange={e => setLineQty(e.target.value)}
                    className="w-full px-2 py-2 border border-input rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={addLine} className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm">Add</button>
                  <button onClick={() => setAddingLine(false)} className="px-3 py-2 border rounded-lg text-sm hover:bg-muted">✕</button>
                </div>
              </div>
            )}
            {lines.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs">Article</th>
                      <th className="text-center px-3 py-2 text-xs">Size</th>
                      <th className="text-right px-3 py-2 text-xs">Stock</th>
                      <th className="text-right px-3 py-2 text-xs">Qty</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => {
                      const over = formType === "Remove" && l.quantity > l.availableStock;
                      return (
                        <tr key={i} className={`border-t ${over ? "bg-red-50" : ""}`}>
                          <td className="px-3 py-2 text-xs font-medium">{l.articleName}</td>
                          <td className="px-3 py-2 text-center font-mono">{l.euroSize}</td>
                          <td className={`px-3 py-2 text-right ${over ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>{l.availableStock}</td>
                          <td className={`px-3 py-2 text-right font-semibold ${over ? "text-red-700" : formType === "Add" ? "text-green-700" : ""}`}>{l.quantity}</td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => removeLine(i)} className="text-muted-foreground hover:text-destructive">✕</button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t bg-muted/30 font-semibold">
                      <td colSpan={3} className="px-3 py-2 text-sm">Total</td>
                      <td className="px-3 py-2 text-right">{totalQty}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-5 text-center text-sm text-muted-foreground">
                <Package size={20} className="mx-auto mb-1.5 opacity-40" />No items added yet.
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-input rounded-lg text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
            >
              {saving
                ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />Saving...</>
                : <><FileText size={14} />Create Draft</>
              }
            </button>
          </div>
        </div>
      </Modal>

      {/* View/Action Modal */}
      {viewDetail && (
        <Modal
          isOpen={viewModal}
          onClose={() => setViewModal(false)}
          title={`Adjustment: ${viewDetail.adjustmentNumber}`}
          subtitle={`${viewDetail.warehouseName} • ${viewDetail.reason}`}
          size="xl"
        >
          <div className="space-y-4">
            {/* Status flow */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2 font-medium">STATUS FLOW</p>
              <StatusFlow current={viewDetail.status} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Type",
                  value: (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${viewDetail.adjustmentType === "Add" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {viewDetail.adjustmentType === "Add" ? "▲ Add" : "▼ Remove"}
                    </span>
                  ),
                },
                { label: "Reason", value: viewDetail.reason },
                { label: "Total Qty", value: <span className="font-bold">{viewDetail.totalQuantity.toLocaleString("en-IN")}</span> },
                { label: "Date", value: formatDate(viewDetail.adjustmentDate) },
              ].map(f => (
                <div key={f.label} className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="font-medium text-sm mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>

            {viewDetail.lines?.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs">Article</th>
                      <th className="text-center px-3 py-2 text-xs">Size</th>
                      <th className="text-right px-3 py-2 text-xs">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewDetail.lines.map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{l.articleCode} — {l.articleName}</td>
                        <td className="px-3 py-2 text-center font-mono">{l.euroSize}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${viewDetail.adjustmentType === "Add" ? "text-green-700" : "text-red-700"}`}>
                          {l.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Actions */}
            {viewDetail.status === "Draft" && (
              <div className="flex gap-3 pt-2 border-t">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  <CheckCircle2 size={14} />Approve
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  <XCircle size={14} />Reject
                </button>
              </div>
            )}
            {viewDetail.status === "Approved" && (
              <div className="flex gap-3 pt-2 border-t">
                <div className="flex-1 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <strong>Approved</strong> — Click "Apply to Stock" to update inventory levels.
                </div>
                <button
                  onClick={handleApply}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  <Play size={14} />Apply to Stock
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reject reason modal */}
      <Modal
        isOpen={rejectModal}
        onClose={() => setRejectModal(false)}
        title="Reject Adjustment"
        subtitle="Provide a reason for rejection"
      >
        <div className="space-y-4">
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            rows={3}
            className="w-full px-3 py-2.5 border border-input rounded-lg text-sm resize-none"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setRejectModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
            <button
              onClick={handleReject}
              disabled={!rejectReason || actionLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
            >
              <XCircle size={14} />Confirm Reject
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
