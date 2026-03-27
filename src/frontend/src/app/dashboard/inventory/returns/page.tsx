"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { RotateCcw, Package, AlertCircle, CheckCircle2 } from "lucide-react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface Warehouse { warehouseId: string; warehouseName: string; }
interface Client    { clientId: string; clientName: string; }
interface Store     { storeId: string; storeName: string; clientId: string; }
interface Article   { articleId: string; articleName: string; articleCode: string; }

interface SizeRunItem { euroSize: string; closingStock: number; qty: string; }
interface LineItem    { articleId: string; articleName: string; euroSize: string; quantity: number; }
interface ArticleGroup {
  articleId: string;
  articleName: string;
  sizes: { euroSize: string; quantity: number }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Received:  "bg-blue-100 text-blue-700",
  Inspected: "bg-yellow-100 text-yellow-700",
  Restocked: "bg-green-100 text-green-700",
  Rejected:  "bg-red-100 text-red-700",
};

const NEXT_STATUSES: Record<string, string[]> = {
  Received:  ["Inspected", "Rejected"],
  Inspected: ["Restocked", "Rejected"],
};

const REASON_COLORS: Record<string, string> = {
  Defective:       "bg-red-100 text-red-700",
  "Wrong Item":    "bg-orange-100 text-orange-700",
  "Customer Return": "bg-blue-100 text-blue-700",
  "Excess Stock":  "bg-purple-100 text-purple-700",
  "Quality Issue": "bg-yellow-100 text-yellow-700",
  Other:           "bg-gray-100 text-gray-700",
};

const RETURN_REASONS = ["Defective", "Wrong Item", "Customer Return", "Excess Stock", "Quality Issue", "Other"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReturnsPage() {
  const { showToast } = useToast();

  // List state
  const [returns, setReturns]     = useState<ReturnRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);

  // Modal state
  const [modalOpen, setModalOpen]   = useState(false);
  const [viewModal, setViewModal]   = useState(false);
  const [viewDetail, setViewDetail] = useState<ReturnDetail | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [pendingStatus, setPendingStatus]   = useState("");

  // Dropdown data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [clients, setClients]       = useState<Client[]>([]);
  const [stores, setStores]         = useState<Store[]>([]);
  const [articles, setArticles]     = useState<Article[]>([]);

  // Form header
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [formClientId, setFormClientId]       = useState("");
  const [formStoreId, setFormStoreId]         = useState("");
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

  const filteredStores = stores.filter(s => !formClientId || s.clientId === formClientId);
  const totalQty       = lines.reduce((s, l) => s + l.quantity, 0);

  const articleGroups = useMemo<ArticleGroup[]>(() => {
    const map = new Map<string, ArticleGroup>();
    for (const l of lines) {
      if (!map.has(l.articleId))
        map.set(l.articleId, { articleId: l.articleId, articleName: l.articleName, sizes: [] });
      map.get(l.articleId)!.sizes.push({ euroSize: l.euroSize, quantity: l.quantity });
    }
    return Array.from(map.values());
  }, [lines]);

  const entryTotal   = sizeRun.reduce((s, r) => s + (parseInt(r.qty) || 0), 0);
  const entryValid   = entryTotal > 0;
  const entryArticle = articles.find(a => a.articleId === entryArticleId);

  // ─── Data loading ──────────────────────────────────────────────────────────

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/stock/returns", {
        params: { search: search || undefined, pageNumber: page, pageSize: 25 },
      });
      if (data.success) {
        setReturns(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch { setReturns([]); }
    finally  { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<any>>("/api/warehouses", { params: { pageSize: 200 } }),
      api.get<ApiResponse<any>>("/api/clients",    { params: { pageSize: 200 } }),
      api.get<ApiResponse<any>>("/api/stores",     { params: { pageSize: 500 } }),
      api.get<ApiResponse<any>>("/api/articles",   { params: { pageSize: 500 } }),
    ]).then(([wh, cl, st, ar]) => {
      if (wh.data.success) setWarehouses(wh.data.data?.items || []);
      if (cl.data.success) setClients(cl.data.data?.items || []);
      if (st.data.success) setStores(st.data.data?.items || []);
      if (ar.data.success) setArticles(ar.data.data?.items || []);
    }).catch(() => {});
  }, []);

  // Fetch ALL sizes for this article (returns endpoint shows 0-stock sizes too via updated backend)
  // When warehouse is not selected, use a query that returns all configured sizes for the article
  useEffect(() => {
    if (!entryArticleId) { setSizeRun([]); return; }

    const warehouseId = formWarehouseId;
    if (!warehouseId) {
      // No warehouse selected yet — can't show stock levels, show empty size run
      setSizeRun([]);
      return;
    }

    setSizeRunLoading(true);
    api.get<ApiResponse<any>>(`/api/stock/warehouse/${warehouseId}/article/${entryArticleId}`)
      .then(({ data }) => {
        if (data.success) {
          const rows: SizeRunItem[] = (data.data?.sizeStock || []).map((s: any) => ({
            euroSize:     String(s.euroSize),
            closingStock: s.closingStock ?? 0,
            qty:          "",
          }));
          setSizeRun(rows);
        }
      })
      .catch(() => setSizeRun([]))
      .finally(() => setSizeRunLoading(false));
  }, [formWarehouseId, entryArticleId]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const addArticle = () => {
    if (!entryValid || !entryArticleId) return;
    const name = entryArticle ? `${entryArticle.articleCode} — ${entryArticle.articleName}` : entryArticleId;
    const newLines = sizeRun
      .filter(s => (parseInt(s.qty) || 0) > 0)
      .map<LineItem>(s => ({
        articleId:   entryArticleId,
        articleName: name,
        euroSize:    s.euroSize,
        quantity:    parseInt(s.qty),
      }));
    setLines(prev => [...prev.filter(l => l.articleId !== entryArticleId), ...newLines]);
    setEntryArticleId("");
    setSizeRun([]);
  };

  const removeArticle = (articleId: string) =>
    setLines(prev => prev.filter(l => l.articleId !== articleId));

  const resetForm = () => {
    setFormWarehouseId(""); setFormClientId(""); setFormStoreId("");
    setFormReason(""); setFormNotes("");
    setLines([]); setEntryArticleId(""); setSizeRun([]); setError("");
  };

  const handleView = async (r: ReturnRecord) => {
    try {
      const { data } = await api.get<ApiResponse<ReturnDetail>>(`/api/stock/returns/${r.returnId}`);
      if (data.success && data.data) {
        setViewDetail(data.data);
        setPendingStatus("");
        setViewModal(true);
      }
    } catch { showToast("error", "Load Error", "Could not load return details."); }
  };

  const handleSave = async () => {
    setError("");
    if (!formWarehouseId)   { setError("Select a warehouse."); return; }
    if (!formReason)        { setError("Select a return reason."); return; }
    if (lines.length === 0) { setError("Add at least one article with quantities."); return; }
    setSaving(true);
    try {
      await api.post("/api/stock/returns", {
        warehouseId: formWarehouseId,
        clientId:    formClientId || undefined,
        storeId:     formStoreId  || undefined,
        reason:      formReason,
        notes:       formNotes || undefined,
        lines: lines.map(l => ({ articleId: l.articleId, euroSize: l.euroSize, quantity: l.quantity })),
      });
      setModalOpen(false);
      showToast("success", "Return Recorded", "Stock return has been recorded and stock levels updated.");
      fetchReturns();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save return.");
    } finally { setSaving(false); }
  };

  const handleStatusUpdate = async () => {
    if (!viewDetail || !pendingStatus) return;
    setStatusUpdating(true);
    try {
      await api.put(`/api/stock/returns/${viewDetail.returnId}/status`, { status: pendingStatus });
      showToast("success", "Status Updated", `Return status changed to "${pendingStatus}".`);
      setViewDetail(prev => prev ? { ...prev, status: pendingStatus } : null);
      setViewModal(false);
      fetchReturns();
    } catch (err: any) {
      showToast("error", "Update Failed", err.response?.data?.message || "Could not update status.");
    } finally { setStatusUpdating(false); }
  };

  const setSizeQty = (euroSize: string, val: string) =>
    setSizeRun(prev => prev.map(r => r.euroSize === euroSize ? { ...r, qty: val } : r));

  const canUpdateStatus = viewDetail && NEXT_STATUSES[viewDetail.status]?.length > 0;

  // ─── Columns ───────────────────────────────────────────────────────────────

  const columns: Column<ReturnRecord>[] = [
    { key: "returnNumber",  header: "Return No",  className: "font-mono text-xs font-semibold text-primary" },
    { key: "returnDate",    header: "Date",        render: r => formatDate(r.returnDate) },
    { key: "warehouseName", header: "Warehouse" },
    { key: "clientName",    header: "Client",      render: r => r.clientName || "—" },
    {
      key: "reason", header: "Reason",
      render: r => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${REASON_COLORS[r.reason] || "bg-gray-100 text-gray-700"}`}>
          {r.reason}
        </span>
      ),
    },
    {
      key: "totalQuantity", header: "Total Qty", className: "text-right font-semibold",
      render: r => <span>{r.totalQuantity.toLocaleString("en-IN")}</span>,
    },
    {
      key: "lineCount", header: "Lines", className: "text-center",
      render: r => <span className="px-2 py-0.5 rounded-full bg-muted text-xs">{r.lineCount}</span>,
    },
    {
      key: "status", header: "Status",
      render: r => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-700"}`}>
          {r.status === "Restocked" && <CheckCircle2 size={10} />}
          {r.status}
        </span>
      ),
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <DataTable
        title="Returns Processing"
        subtitle="Record inward stock returns from clients and stores — enter quantities per size run"
        columns={columns}
        data={returns}
        totalCount={totalCount}
        pageNumber={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={() => { resetForm(); setModalOpen(true); }}
        onEdit={handleView}
        onExport={() => {}}
        addLabel="New Return"
        loading={loading}
        keyExtractor={r => r.returnId}
      />

      {/* ── Create Return Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Return"
        subtitle="Record an inward stock return — enter return quantities across the size run per article"
        size="xl"
      >
        <div className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}

          {/* Warehouse + Client */}
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
              <label className="block text-sm font-medium mb-1.5">Client</label>
              <select
                value={formClientId}
                onChange={e => { setFormClientId(e.target.value); setFormStoreId(""); }}
                className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Client (optional)</option>
                {clients.map(c => <option key={c.clientId} value={c.clientId}>{c.clientName}</option>)}
              </select>
            </div>
          </div>

          {/* Store + Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Store</label>
              <select
                value={formStoreId}
                onChange={e => setFormStoreId(e.target.value)}
                disabled={!formClientId}
                className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              >
                <option value="">{formClientId ? "Select Store" : "Select client first"}</option>
                {filteredStores.map(s => <option key={s.storeId} value={s.storeId}>{s.storeName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Return Reason <span className="text-red-500">*</span></label>
              <select
                value={formReason}
                onChange={e => setFormReason(e.target.value)}
                className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Reason</option>
                {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* ── Article Size Run Entry ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Articles & Return Quantities <span className="text-red-500">*</span></label>
              <span className="text-xs text-muted-foreground">All sizes shown — returns add back to stock</span>
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
                <div className="px-3 py-2 bg-green-500/10 border-b flex items-center justify-between">
                  <span className="text-xs font-semibold text-green-700">
                    SIZE RUN — {entryArticle?.articleCode}
                  </span>
                  {sizeRunLoading && <div className="animate-spin rounded-full h-3 w-3 border-2 border-green-600 border-t-transparent" />}
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
                          {/* Current stock row (for reference only) */}
                          <tr className="border-t">
                            <td className="px-3 py-1.5 text-xs text-muted-foreground">Current Stock</td>
                            {sizeRun.map(s => (
                              <td key={s.euroSize} className={`px-2 py-1.5 text-center text-xs tabular-nums ${s.closingStock > 0 ? "text-blue-700 font-medium" : "text-muted-foreground"}`}>
                                {s.closingStock}
                              </td>
                            ))}
                            <td className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">
                              {sizeRun.reduce((n, s) => n + s.closingStock, 0)}
                            </td>
                          </tr>
                          {/* Return qty row */}
                          <tr className="border-t bg-green-50/30">
                            <td className="px-3 py-2 text-xs font-semibold text-green-700">Return Qty</td>
                            {sizeRun.map(s => (
                              <td key={s.euroSize} className="px-1 py-2 text-center">
                                <input
                                  type="number" min="0"
                                  value={s.qty}
                                  onChange={e => setSizeQty(s.euroSize, e.target.value)}
                                  className="w-14 px-1 py-1 text-center text-xs border border-input bg-white rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                  placeholder="0"
                                />
                              </td>
                            ))}
                            <td className="px-3 py-2 text-right text-sm font-bold text-green-700 tabular-nums">
                              {entryTotal}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5 border-t bg-muted/10">
                      <span className="text-xs text-muted-foreground">
                        {entryTotal > 0
                          ? `${sizeRun.filter(s => (parseInt(s.qty) || 0) > 0).length} size(s) · ${entryTotal} pcs`
                          : "Enter return quantities per size above"}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => { setEntryArticleId(""); setSizeRun([]); }}
                          className="px-3 py-1.5 text-xs border rounded-lg hover:bg-muted">Clear</button>
                        <button onClick={addArticle} disabled={!entryValid}
                          className="px-4 py-1.5 text-xs bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-green-700">
                          Add Article
                        </button>
                      </div>
                    </div>
                  </>
                ) : !sizeRunLoading ? (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No sizes configured for this article. Check article setup in master data.
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
                  const gt = group.sizes.reduce((n, s) => n + s.quantity, 0);
                  return (
                    <div key={group.articleId} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-green-50">
                        <span className="text-xs font-semibold">{group.articleName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-green-700">+{gt.toLocaleString()} pcs</span>
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
                              {group.sizes.map(s => (
                                <td key={s.euroSize} className="px-2 py-2 text-center font-semibold text-green-700 tabular-nums">{s.quantity}</td>
                              ))}
                              <td className="px-3 py-2 text-right font-bold">{gt}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center px-3 py-2 bg-muted/20 rounded-lg text-sm font-semibold border">
                  <span>Grand Total (Return)</span>
                  <span className="text-green-700">+{totalQty.toLocaleString()} pcs</span>
                </div>
              </div>
            ) : !entryArticleId ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                <Package size={24} className="mx-auto mb-2 opacity-40" />
                Select an article above and enter return quantities across the size run.
              </div>
            ) : null}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
              placeholder="Additional details about this return..."
              className="w-full px-3 py-2.5 border border-input rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
              {saving
                ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />Saving…</>
                : <><RotateCcw size={14} />Record Return</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── View Detail Modal ── */}
      {viewDetail && (
        <Modal
          isOpen={viewModal}
          onClose={() => setViewModal(false)}
          title={`Return: ${viewDetail.returnNumber}`}
          subtitle={`${viewDetail.warehouseName} · ${formatDate(viewDetail.returnDate)}`}
          size="xl"
        >
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Status", value: (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[viewDetail.status] || "bg-gray-100 text-gray-700"}`}>
                    {viewDetail.status}
                  </span>
                )},
                { label: "Reason", value: (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REASON_COLORS[viewDetail.reason] || "bg-gray-100 text-gray-700"}`}>
                    {viewDetail.reason}
                  </span>
                )},
                { label: "Client", value: viewDetail.clientName || "—" },
                { label: "Store",  value: viewDetail.storeName  || "—" },
              ].map(f => (
                <div key={f.label} className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="font-medium text-sm mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>

            {/* Lines grouped by article */}
            <div className="space-y-2">
              {(() => {
                const groups = new Map<string, { code: string; name: string; sizes: { euroSize: string; qty: number }[] }>();
                for (const l of viewDetail.lines ?? []) {
                  if (!groups.has(l.articleCode))
                    groups.set(l.articleCode, { code: l.articleCode, name: l.articleName, sizes: [] });
                  groups.get(l.articleCode)!.sizes.push({ euroSize: l.euroSize, qty: l.quantity });
                }
                return Array.from(groups.values()).map(g => {
                  const gt = g.sizes.reduce((n, s) => n + s.qty, 0);
                  return (
                    <div key={g.code} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-green-50">
                        <span className="text-xs font-semibold">{g.code} — {g.name}</span>
                        <span className="text-xs font-medium text-green-700">+{gt.toLocaleString()} pcs</span>
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
                              {g.sizes.map(s => <td key={s.euroSize} className="px-2 py-2 text-center font-semibold text-green-700">{s.qty}</td>)}
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

            {viewDetail.notes && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{viewDetail.notes}</p>
              </div>
            )}

            {/* Status update */}
            {canUpdateStatus && (
              <div className="border border-dashed rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Update Status</p>
                <p className="text-xs text-muted-foreground">
                  Current: <strong>{viewDetail.status}</strong>. Select the next status to advance this return.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select value={pendingStatus} onChange={e => setPendingStatus(e.target.value)}
                    className="flex-1 px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Select new status</option>
                    {NEXT_STATUSES[viewDetail.status]?.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={handleStatusUpdate} disabled={!pendingStatus || statusUpdating}
                    className="flex items-center justify-center gap-2 px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 whitespace-nowrap">
                    {statusUpdating
                      ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />Updating…</>
                      : "Apply Status"}
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
