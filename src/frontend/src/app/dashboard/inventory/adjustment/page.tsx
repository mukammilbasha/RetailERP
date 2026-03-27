"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { CheckCircle2, XCircle, Play, AlertCircle, FileText, Clock, Package } from "lucide-react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

// ─── Types ───────────────────────────────────────────────────────────────────

type AdjStatus = "Draft" | "Approved" | "Applied" | "Rejected";
type AdjType   = "Add"   | "Remove";

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
interface Article   { articleId: string; articleName: string; articleCode: string; }

interface SizeRunItem  { euroSize: string; closingStock: number; qty: string; }
interface LineItem     { articleId: string; articleName: string; euroSize: string; quantity: number; availableStock: number; }
interface ArticleGroup {
  articleId: string;
  articleName: string;
  sizes: { euroSize: string; quantity: number; availableStock: number }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AdjStatus, { color: string; icon: React.ReactNode; label: string }> = {
  Draft:    { color: "bg-gray-100 text-gray-700",   icon: <FileText size={10} />,    label: "Draft"    },
  Approved: { color: "bg-blue-100 text-blue-700",   icon: <CheckCircle2 size={10} />, label: "Approved" },
  Applied:  { color: "bg-green-100 text-green-700", icon: <Play size={10} />,         label: "Applied"  },
  Rejected: { color: "bg-red-100 text-red-700",     icon: <XCircle size={10} />,      label: "Rejected" },
};

const REASONS = ["Damaged", "Lost", "Found", "Correction", "Physical Verification", "System Error", "Other"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function StockAdjustmentPage() {
  const { showToast } = useToast();
  const { confirm }   = useConfirm();

  // List state
  const [adjustments, setAdjustments] = useState<AdjRecord[]>([]);
  const [totalCount, setTotalCount]   = useState(0);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading]         = useState(true);

  // Modal state
  const [modalOpen, setModalOpen]     = useState(false);
  const [viewModal, setViewModal]     = useState(false);
  const [viewDetail, setViewDetail]   = useState<AdjDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason]   = useState("");
  const [rejectModal, setRejectModal]     = useState(false);

  // Dropdown data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [articles, setArticles]     = useState<Article[]>([]);

  // Form header
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [formType, setFormType]               = useState<AdjType>("Add");
  const [formReason, setFormReason]           = useState("");
  const [formNotes, setFormNotes]             = useState("");

  // Size run entry state
  const [entryArticleId, setEntryArticleId] = useState("");
  const [sizeRun, setSizeRun]               = useState<SizeRunItem[]>([]);
  const [sizeRunLoading, setSizeRunLoading] = useState(false);

  // Lines (flat — grouped for display)
  const [lines, setLines]   = useState<LineItem[]>([]);
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);

  const articleGroups = useMemo<ArticleGroup[]>(() => {
    const map = new Map<string, ArticleGroup>();
    for (const l of lines) {
      if (!map.has(l.articleId))
        map.set(l.articleId, { articleId: l.articleId, articleName: l.articleName, sizes: [] });
      map.get(l.articleId)!.sizes.push({ euroSize: l.euroSize, quantity: l.quantity, availableStock: l.availableStock });
    }
    return Array.from(map.values());
  }, [lines]);

  const entryTotal   = sizeRun.reduce((s, r) => s + (parseInt(r.qty) || 0), 0);
  const entryArticle = articles.find(a => a.articleId === entryArticleId);

  // For Remove: invalid if any entered qty exceeds available stock
  const entryHasOver = formType === "Remove" && sizeRun.some(r => (parseInt(r.qty) || 0) > r.closingStock);
  const entryValid   = entryTotal > 0 && !entryHasOver;

  // ─── Data loading ──────────────────────────────────────────────────────────

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
    } catch { setAdjustments([]); }
    finally  { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchAdjustments(); }, [fetchAdjustments]);

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<any>>("/api/warehouses", { params: { pageSize: 200 } }),
      api.get<ApiResponse<any>>("/api/articles",   { params: { pageSize: 500 } }),
    ]).then(([wh, ar]) => {
      if (wh.data.success) setWarehouses(wh.data.data?.items || []);
      if (ar.data.success) setArticles(ar.data.data?.items || []);
    }).catch(() => {});
  }, []);

  // Fetch size run — all configured sizes (backend now LEFT JOINs product.ArticleSizes)
  useEffect(() => {
    if (!formWarehouseId || !entryArticleId) { setSizeRun([]); return; }
    setSizeRunLoading(true);
    api.get<ApiResponse<any>>(`/api/stock/warehouse/${formWarehouseId}/article/${entryArticleId}`)
      .then(({ data }) => {
        if (data.success) {
          let rows: SizeRunItem[] = (data.data?.sizeStock || []).map((s: any) => ({
            euroSize:     String(s.euroSize),
            closingStock: s.closingStock ?? 0,
            qty:          "",
          }));
          // For Remove: only show sizes that have stock
          if (formType === "Remove") rows = rows.filter(r => r.closingStock > 0);
          setSizeRun(rows);
        }
      })
      .catch(() => setSizeRun([]))
      .finally(() => setSizeRunLoading(false));
  }, [formWarehouseId, entryArticleId, formType]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const addArticle = () => {
    if (!entryValid || !entryArticleId) return;
    const name = entryArticle ? `${entryArticle.articleCode} — ${entryArticle.articleName}` : entryArticleId;
    const newLines = sizeRun
      .filter(s => (parseInt(s.qty) || 0) > 0)
      .map<LineItem>(s => ({
        articleId:      entryArticleId,
        articleName:    name,
        euroSize:       s.euroSize,
        quantity:       parseInt(s.qty),
        availableStock: s.closingStock,
      }));
    setLines(prev => [...prev.filter(l => l.articleId !== entryArticleId), ...newLines]);
    setEntryArticleId("");
    setSizeRun([]);
  };

  const removeArticle = (articleId: string) =>
    setLines(prev => prev.filter(l => l.articleId !== articleId));

  const resetForm = () => {
    setFormWarehouseId(""); setFormType("Add"); setFormReason(""); setFormNotes("");
    setLines([]); setEntryArticleId(""); setSizeRun([]); setError("");
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
      showToast("success", "Adjustment Approved", `${viewDetail.adjustmentNumber} approved.`);
      fetchAdjustments();
    } catch (err: any) {
      showToast("error", "Failed to Approve", err.response?.data?.message || "An error occurred.");
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!viewDetail || !rejectReason) return;
    setActionLoading(true);
    try {
      await api.put(`/api/stock/adjustments/${viewDetail.adjustmentId}/reject`, { reason: rejectReason });
      setViewDetail(prev => prev ? { ...prev, status: "Rejected" } : null);
      setRejectModal(false);
      setRejectReason("");
      showToast("success", "Adjustment Rejected", "The adjustment has been rejected.");
      fetchAdjustments();
    } catch (err: any) {
      showToast("error", "Failed to Reject", err.response?.data?.message || "An error occurred.");
    } finally { setActionLoading(false); }
  };

  const handleApply = async () => {
    if (!viewDetail) return;
    const confirmed = await confirm({
      title:        "Apply Adjustment",
      message:      "Apply this adjustment to stock? This will permanently update stock levels.",
      confirmLabel: "Apply to Stock",
      variant:      "danger",
    });
    if (!confirmed) return;
    setActionLoading(true);
    try {
      await api.post(`/api/stock/adjustments/${viewDetail.adjustmentId}/apply`);
      setViewDetail(prev => prev ? { ...prev, status: "Applied" } : null);
      showToast("success", "Adjustment Applied", `${viewDetail.adjustmentNumber} applied to stock.`);
      fetchAdjustments();
    } catch (err: any) {
      showToast("error", "Failed to Apply", err.response?.data?.message || "An error occurred.");
    } finally { setActionLoading(false); }
  };

  const handleSave = async () => {
    setError("");
    if (!formWarehouseId)   { setError("Select a warehouse."); return; }
    if (!formReason)        { setError("Select a reason."); return; }
    if (lines.length === 0) { setError("Add at least one article with quantities."); return; }
    if (formType === "Remove") {
      const over = lines.filter(l => l.quantity > l.availableStock);
      if (over.length > 0) {
        setError(`Insufficient stock for removal: ${over.map(l => `${l.articleName} EU${l.euroSize}`).join(", ")}`);
        return;
      }
    }
    setSaving(true);
    try {
      await api.post("/api/stock/adjustments", {
        warehouseId:    formWarehouseId,
        adjustmentType: formType,
        reason:         formReason,
        notes:          formNotes || undefined,
        lines: lines.map(l => ({ articleId: l.articleId, euroSize: l.euroSize, quantity: l.quantity })),
      });
      setModalOpen(false);
      showToast("success", "Draft Created", "Stock adjustment draft created. Awaiting approval.");
      fetchAdjustments();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save adjustment");
    } finally { setSaving(false); }
  };

  const setSizeQty = (euroSize: string, val: string) =>
    setSizeRun(prev => prev.map(r => r.euroSize === euroSize ? { ...r, qty: val } : r));

  // ─── Status Flow Banner ────────────────────────────────────────────────────

  const StatusFlow = ({ current }: { current: AdjStatus }) => {
    const steps: AdjStatus[] = ["Draft", "Approved", "Applied"];
    return (
      <div className="flex items-center gap-1">
        {steps.map((s, i) => {
          const isActive  = s === current;
          const isPast    = steps.indexOf(current) > i;
          const isRejected = current === "Rejected";
          return (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                isRejected && s === "Draft" ? "bg-red-100 text-red-700" :
                isActive   ? "bg-primary text-primary-foreground" :
                isPast     ? "bg-green-100 text-green-700" :
                             "bg-muted text-muted-foreground"
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

  // ─── Columns ───────────────────────────────────────────────────────────────

  const columns: Column<AdjRecord>[] = [
    { key: "adjustmentNumber", header: "Adj. No", className: "font-mono text-xs font-semibold text-primary" },
    { key: "adjustmentDate",   header: "Date",      render: a => formatDate(a.adjustmentDate) },
    { key: "warehouseName",    header: "Warehouse" },
    {
      key: "adjustmentType", header: "Type",
      render: a => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.adjustmentType === "Add" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {a.adjustmentType === "Add" ? "▲ Add" : "▼ Remove"}
        </span>
      ),
    },
    { key: "reason", header: "Reason" },
    {
      key: "totalQuantity", header: "Qty", className: "text-right font-semibold",
      render: a => <span>{a.totalQuantity.toLocaleString("en-IN")}</span>,
    },
    {
      key: "status", header: "Status",
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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Status filter tabs */}
      <div className="px-6 pt-4 flex gap-2 flex-wrap">
        {(["", "Draft", "Approved", "Applied", "Rejected"] as const).map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
            {s === "" ? "All" : s}
          </button>
        ))}
      </div>

      <DataTable
        title="Stock Adjustment"
        subtitle="Add or remove stock for corrections, damages, and discrepancies — enter quantities per size run"
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
        addLabel="New Adjustment"
        loading={loading}
        keyExtractor={a => a.adjustmentId}
      />

      {/* ── Create Adjustment Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Stock Adjustment"
        subtitle="Creates a Draft — requires approval before applying to stock"
        size="xl"
      >
        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />{error}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <Clock size={14} />
            <span>Adjustments are created as <strong>Draft</strong> and must be approved before they affect stock.</span>
          </div>

          {/* Warehouse + Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Warehouse <span className="text-red-500">*</span></label>
              <select
                value={formWarehouseId}
                onChange={e => { setFormWarehouseId(e.target.value); setLines([]); setEntryArticleId(""); setSizeRun([]); }}
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
                  <button key={t} type="button" onClick={() => { setFormType(t); setLines([]); setEntryArticleId(""); setSizeRun([]); }}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                      formType === t
                        ? (t === "Add" ? "bg-green-600 text-white border-green-600" : "bg-red-600 text-white border-red-600")
                        : "hover:bg-muted"
                    }`}>
                    {t === "Add" ? "▲ Add Stock" : "▼ Remove Stock"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Reason <span className="text-red-500">*</span></label>
            <select value={formReason} onChange={e => setFormReason(e.target.value)}
              className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Select Reason</option>
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* ── Article Size Run Entry ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Articles & Quantities <span className="text-red-500">*</span></label>
              <span className="text-xs text-muted-foreground">
                {formType === "Remove" ? "Only sizes with available stock shown" : "All configured sizes shown"}
              </span>
            </div>

            {/* Article selector */}
            <div className="mb-3">
              <select
                value={entryArticleId}
                onChange={e => { setEntryArticleId(e.target.value); setSizeRun([]); }}
                disabled={!formWarehouseId}
                className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              >
                <option value="">{formWarehouseId ? "Select Article to Enter Size Run" : "Select warehouse first"}</option>
                {articles.map(a => <option key={a.articleId} value={a.articleId}>{a.articleCode} — {a.articleName}</option>)}
              </select>
            </div>

            {/* Size run grid */}
            {entryArticleId && (
              <div className="mb-4 border rounded-lg overflow-hidden shadow-sm">
                <div className={`px-3 py-2 border-b flex items-center justify-between ${formType === "Add" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                  <span className={`text-xs font-semibold ${formType === "Add" ? "text-green-700" : "text-red-700"}`}>
                    SIZE RUN — {entryArticle?.articleCode} ({formType === "Add" ? "▲ Add" : "▼ Remove"})
                  </span>
                  {sizeRunLoading && <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent" />}
                </div>

                {sizeRun.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-max">
                        <thead>
                          <tr className="bg-muted/20">
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-28">Field</th>
                            {sizeRun.map(s => (
                              <th key={s.euroSize} className="px-2 py-2 text-center text-xs font-semibold min-w-[3.5rem]">
                                EU&nbsp;{s.euroSize}
                              </th>
                            ))}
                            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Stock row */}
                          <tr className="border-t">
                            <td className="px-3 py-1.5 text-xs text-muted-foreground">
                              {formType === "Remove" ? "Available" : "Current Stock"}
                            </td>
                            {sizeRun.map(s => (
                              <td key={s.euroSize} className={`px-2 py-1.5 text-center text-xs tabular-nums ${s.closingStock > 0 ? "text-green-700 font-medium" : "text-muted-foreground"}`}>
                                {s.closingStock}
                              </td>
                            ))}
                            <td className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">
                              {sizeRun.reduce((n, s) => n + s.closingStock, 0)}
                            </td>
                          </tr>
                          {/* Qty entry row */}
                          <tr className={`border-t ${formType === "Add" ? "bg-green-50/30" : "bg-red-50/30"}`}>
                            <td className={`px-3 py-2 text-xs font-semibold ${formType === "Add" ? "text-green-700" : "text-red-700"}`}>
                              {formType === "Add" ? "Add Qty" : "Remove Qty"}
                            </td>
                            {sizeRun.map(s => {
                              const qty  = parseInt(s.qty) || 0;
                              const over = formType === "Remove" && qty > s.closingStock;
                              return (
                                <td key={s.euroSize} className="px-1 py-2 text-center">
                                  <input
                                    type="number" min="0"
                                    max={formType === "Remove" ? s.closingStock : undefined}
                                    value={s.qty}
                                    onChange={e => setSizeQty(s.euroSize, e.target.value)}
                                    className={`w-14 px-1 py-1 text-center text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary ${
                                      over ? "border-red-400 bg-red-50 text-red-700" : "border-input bg-white"
                                    }`}
                                    placeholder="0"
                                  />
                                </td>
                              );
                            })}
                            <td className={`px-3 py-2 text-right text-sm font-bold tabular-nums ${formType === "Add" ? "text-green-700" : "text-red-700"}`}>
                              {entryTotal}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5 border-t bg-muted/10">
                      <span className="text-xs text-muted-foreground">
                        {entryHasOver ? "⚠ Qty exceeds available stock for some sizes" :
                          entryTotal > 0
                            ? `${sizeRun.filter(s => (parseInt(s.qty) || 0) > 0).length} size(s) · ${entryTotal} pcs`
                            : "Enter quantities per size above"}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => { setEntryArticleId(""); setSizeRun([]); }}
                          className="px-3 py-1.5 text-xs border rounded-lg hover:bg-muted">Clear</button>
                        <button onClick={addArticle} disabled={!entryValid}
                          className={`px-4 py-1.5 text-xs text-white rounded-lg font-medium disabled:opacity-50 ${formType === "Add" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                          Add Article
                        </button>
                      </div>
                    </div>
                  </>
                ) : !sizeRunLoading ? (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                    {formType === "Remove"
                      ? "No stock available for this article in the selected warehouse."
                      : "No sizes configured. Check article setup in master data."}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">Loading sizes…</div>
                )}
              </div>
            )}

            {/* Added articles (grouped) */}
            {articleGroups.length > 0 ? (
              <div className="space-y-2">
                {articleGroups.map(group => {
                  const gt  = group.sizes.reduce((n, s) => n + s.quantity, 0);
                  const over = formType === "Remove" && group.sizes.some(s => s.quantity > s.availableStock);
                  return (
                    <div key={group.articleId} className={`border rounded-lg overflow-hidden ${over ? "border-red-300" : ""}`}>
                      <div className={`flex items-center justify-between px-3 py-2 ${over ? "bg-red-50" : formType === "Add" ? "bg-green-50" : "bg-red-50/50"}`}>
                        <span className="text-xs font-semibold">{group.articleName}</span>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-medium ${formType === "Add" ? "text-green-700" : "text-red-700"}`}>
                            {formType === "Add" ? "+" : "−"}{gt.toLocaleString()} pcs
                          </span>
                          <button onClick={() => removeArticle(group.articleId)}
                            className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-t bg-muted/10">
                              {group.sizes.map(s => (
                                <th key={s.euroSize} className="px-2 py-1.5 text-center text-muted-foreground font-medium min-w-[3rem]">
                                  EU&nbsp;{s.euroSize}
                                </th>
                              ))}
                              <th className="px-3 py-1.5 text-right text-muted-foreground font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t">
                              {group.sizes.map(s => {
                                const o = formType === "Remove" && s.quantity > s.availableStock;
                                return (
                                  <td key={s.euroSize} className={`px-2 py-2 text-center font-semibold tabular-nums ${
                                    o ? "text-red-700" : formType === "Add" ? "text-green-700" : "text-red-600"
                                  }`}>
                                    {s.quantity}
                                    {o && <span className="block text-red-400 font-normal text-[10px]">avl:{s.availableStock}</span>}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-right font-bold">{gt}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center px-3 py-2 bg-muted/20 rounded-lg text-sm font-semibold border">
                  <span>Grand Total ({formType})</span>
                  <span className={formType === "Add" ? "text-green-700" : "text-red-700"}>
                    {formType === "Add" ? "+" : "−"}{totalQty.toLocaleString()} pcs
                  </span>
                </div>
              </div>
            ) : !entryArticleId ? (
              <div className="border-2 border-dashed rounded-lg p-5 text-center text-sm text-muted-foreground">
                <Package size={20} className="mx-auto mb-1.5 opacity-40" />
                Select an article above and enter quantities across the size run.
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 border border-input rounded-lg text-sm resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium">
              {saving
                ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />Saving…</>
                : <><FileText size={14} />Create Draft</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── View / Action Modal ── */}
      {viewDetail && (
        <Modal
          isOpen={viewModal}
          onClose={() => setViewModal(false)}
          title={`Adjustment: ${viewDetail.adjustmentNumber}`}
          subtitle={`${viewDetail.warehouseName} · ${viewDetail.reason}`}
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
                { label: "Type", value: (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${viewDetail.adjustmentType === "Add" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {viewDetail.adjustmentType === "Add" ? "▲ Add" : "▼ Remove"}
                  </span>
                )},
                { label: "Reason",    value: viewDetail.reason },
                { label: "Total Qty", value: <span className="font-bold">{viewDetail.totalQuantity.toLocaleString("en-IN")}</span> },
                { label: "Date",      value: formatDate(viewDetail.adjustmentDate) },
              ].map(f => (
                <div key={f.label} className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="font-medium text-sm mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>

            {/* Lines grouped by article */}
            {viewDetail.lines?.length > 0 && (
              <div className="space-y-2">
                {(() => {
                  const groups = new Map<string, { code: string; name: string; sizes: { euroSize: string; qty: number }[] }>();
                  for (const l of viewDetail.lines) {
                    if (!groups.has(l.articleCode))
                      groups.set(l.articleCode, { code: l.articleCode, name: l.articleName, sizes: [] });
                    groups.get(l.articleCode)!.sizes.push({ euroSize: l.euroSize, qty: l.quantity });
                  }
                  return Array.from(groups.values()).map(g => {
                    const gt = g.sizes.reduce((n, s) => n + s.qty, 0);
                    return (
                      <div key={g.code} className="border rounded-lg overflow-hidden">
                        <div className={`flex items-center justify-between px-3 py-2 ${viewDetail.adjustmentType === "Add" ? "bg-green-50" : "bg-red-50/50"}`}>
                          <span className="text-xs font-semibold">{g.code} — {g.name}</span>
                          <span className={`text-xs font-medium ${viewDetail.adjustmentType === "Add" ? "text-green-700" : "text-red-700"}`}>
                            {viewDetail.adjustmentType === "Add" ? "+" : "−"}{gt} pcs
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-t bg-muted/10">
                                {g.sizes.map(s => <th key={s.euroSize} className="px-2 py-1.5 text-center text-muted-foreground font-medium">EU&nbsp;{s.euroSize}</th>)}
                                <th className="px-3 py-1.5 text-right text-muted-foreground">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-t">
                                {g.sizes.map(s => (
                                  <td key={s.euroSize} className={`px-2 py-2 text-center font-semibold ${viewDetail.adjustmentType === "Add" ? "text-green-700" : "text-red-700"}`}>
                                    {s.qty}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-right font-bold">{gt}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Actions */}
            {viewDetail.status === "Draft" && (
              <div className="flex gap-3 pt-2 border-t">
                <button onClick={handleApprove} disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                  <CheckCircle2 size={14} />Approve
                </button>
                <button onClick={() => setRejectModal(true)} disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium">
                  <XCircle size={14} />Reject
                </button>
              </div>
            )}
            {viewDetail.status === "Approved" && (
              <div className="flex gap-3 pt-2 border-t">
                <div className="flex-1 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <strong>Approved</strong> — Click "Apply to Stock" to permanently update inventory levels.
                </div>
                <button onClick={handleApply} disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
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
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            rows={3}
            className="w-full px-3 py-2.5 border border-input rounded-lg text-sm resize-none" />
          <div className="flex justify-end gap-3">
            <button onClick={() => setRejectModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
            <button onClick={handleReject} disabled={!rejectReason || actionLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium">
              <XCircle size={14} />Confirm Reject
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
