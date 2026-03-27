"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Truck, Package, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DispatchRecord {
  dispatchId: string;
  dispatchNumber: string;
  dispatchDate: string;
  warehouseName: string;
  clientName: string;
  storeName: string;
  totalQuantity: number;
  lineCount: number;
  referenceOrderNo: string;
  transportMode: string;
  vehicleNo: string;
  status: string;
  createdAt: string;
}

interface DispatchLine {
  dispatchLineId: string;
  articleCode: string;
  articleName: string;
  color: string;
  euroSize: string;
  quantity: number;
}

interface DispatchDetail extends DispatchRecord {
  notes: string;
  logisticsPartner: string;
  lines: DispatchLine[];
}

interface Warehouse { warehouseId: string; warehouseName: string; }
interface Client    { clientId: string; clientName: string; }
interface Store     { storeId: string; storeName: string; clientId: string; }
interface Article   { articleId: string; articleName: string; articleCode: string; }

interface SizeRunItem { euroSize: string; closingStock: number; qty: string; }
interface LineItem    { articleId: string; articleName: string; euroSize: string; quantity: number; availableStock: number; }
interface ArticleGroup {
  articleId: string;
  articleName: string;
  sizes: { euroSize: string; quantity: number; availableStock: number }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Dispatched: "bg-blue-100 text-blue-700",
  Delivered:  "bg-green-100 text-green-700",
  Cancelled:  "bg-red-100 text-red-700",
};

const NEXT_STATUSES: Record<string, string[]> = {
  Dispatched: ["Delivered", "Cancelled"],
};

const TRANSPORT_MODES = ["Road", "Rail", "Air", "Sea", "Courier"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function DispatchPage() {
  const { showToast } = useToast();
  const { confirm }   = useConfirm();

  // List state
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(true);

  // Modal state
  const [modalOpen, setModalOpen]     = useState(false);
  const [viewModal, setViewModal]     = useState(false);
  const [viewDetail, setViewDetail]   = useState<DispatchDetail | null>(null);
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
  const [formRefOrderNo, setFormRefOrderNo]   = useState("");
  const [formTransportMode, setFormTransportMode] = useState("");
  const [formVehicleNo, setFormVehicleNo]     = useState("");
  const [formLogistics, setFormLogistics]     = useState("");
  const [formNotes, setFormNotes]             = useState("");

  // Size run entry state
  const [entryArticleId, setEntryArticleId]   = useState("");
  const [sizeRun, setSizeRun]                 = useState<SizeRunItem[]>([]);
  const [sizeRunLoading, setSizeRunLoading]   = useState(false);

  // Lines (flat — grouped for display via useMemo)
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
      map.get(l.articleId)!.sizes.push({ euroSize: l.euroSize, quantity: l.quantity, availableStock: l.availableStock });
    }
    return Array.from(map.values());
  }, [lines]);

  const entryTotal  = sizeRun.reduce((s, r) => s + (parseInt(r.qty) || 0), 0);
  const entryValid  = entryTotal > 0 && !sizeRun.some(r => (parseInt(r.qty) || 0) > r.closingStock);
  const entryArticle = articles.find(a => a.articleId === entryArticleId);

  // ─── Data loading ──────────────────────────────────────────────────────────

  const fetchDispatches = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/stock/dispatch", {
        params: { search: search || undefined, pageNumber: page, pageSize: 25 },
      });
      if (data.success) {
        setDispatches(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch { setDispatches([]); }
    finally  { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchDispatches(); }, [fetchDispatches]);

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

  // Fetch size run when warehouse + article both set
  useEffect(() => {
    if (!formWarehouseId || !entryArticleId) { setSizeRun([]); return; }
    setSizeRunLoading(true);
    api.get<ApiResponse<any>>(`/api/stock/warehouse/${formWarehouseId}/article/${entryArticleId}`)
      .then(({ data }) => {
        if (data.success) {
          const rows: SizeRunItem[] = (data.data?.sizeStock || []).map((s: any) => ({
            euroSize: String(s.euroSize),
            closingStock: s.closingStock ?? 0,
            qty: "",
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
    setFormWarehouseId(""); setFormClientId(""); setFormStoreId("");
    setFormRefOrderNo(""); setFormTransportMode(""); setFormVehicleNo("");
    setFormLogistics(""); setFormNotes("");
    setLines([]); setEntryArticleId(""); setSizeRun([]); setError("");
  };

  const handleView = async (d: DispatchRecord) => {
    try {
      const { data } = await api.get<ApiResponse<DispatchDetail>>(`/api/stock/dispatch/${d.dispatchId}`);
      if (data.success && data.data) {
        setViewDetail(data.data);
        setPendingStatus("");
        setViewModal(true);
      }
    } catch { showToast("error", "Load Error", "Could not load dispatch details."); }
  };

  const handleSave = async () => {
    setError("");
    if (!formWarehouseId)  { setError("Select a warehouse."); return; }
    if (lines.length === 0) { setError("Add at least one article with quantities."); return; }
    const overAllocated = lines.filter(l => l.quantity > l.availableStock);
    if (overAllocated.length > 0) {
      setError(`Insufficient stock for: ${overAllocated.map(l => `${l.articleName} (EU ${l.euroSize})`).join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/stock/dispatch", {
        warehouseId:      formWarehouseId,
        clientId:         formClientId || undefined,
        storeId:          formStoreId  || undefined,
        referenceOrderNo: formRefOrderNo  || undefined,
        transportMode:    formTransportMode || undefined,
        vehicleNo:        formVehicleNo  || undefined,
        logisticsPartner: formLogistics  || undefined,
        notes:            formNotes      || undefined,
        lines: lines.map(l => ({ articleId: l.articleId, euroSize: l.euroSize, quantity: l.quantity })),
      });
      setModalOpen(false);
      showToast("success", "Dispatch Created", "Stock has been dispatched and stock levels updated.");
      fetchDispatches();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save dispatch.");
    } finally { setSaving(false); }
  };

  const handleStatusUpdate = async () => {
    if (!viewDetail || !pendingStatus) return;
    if (pendingStatus === "Cancelled") {
      const ok = await confirm({
        title: "Cancel Dispatch",
        message: "Cancel this dispatch? This action cannot be undone.",
        confirmLabel: "Cancel Dispatch",
        variant: "danger",
      });
      if (!ok) return;
    }
    setStatusUpdating(true);
    try {
      await api.put(`/api/stock/dispatch/${viewDetail.dispatchId}/status`, { status: pendingStatus });
      showToast("success", "Status Updated", `Dispatch status changed to "${pendingStatus}".`);
      setViewDetail(prev => prev ? { ...prev, status: pendingStatus } : null);
      setViewModal(false);
      fetchDispatches();
    } catch (err: any) {
      showToast("error", "Update Failed", err.response?.data?.message || "Could not update status.");
    } finally { setStatusUpdating(false); }
  };

  // ─── Size run qty setter ───────────────────────────────────────────────────

  const setSizeQty = (euroSize: string, val: string) =>
    setSizeRun(prev => prev.map(r => r.euroSize === euroSize ? { ...r, qty: val } : r));

  // ─── Columns ───────────────────────────────────────────────────────────────

  const columns: Column<DispatchRecord>[] = [
    { key: "dispatchNumber", header: "Dispatch No", className: "font-mono text-xs font-semibold text-primary" },
    { key: "dispatchDate",   header: "Date",   render: d => formatDate(d.dispatchDate) },
    { key: "warehouseName",  header: "Warehouse" },
    { key: "clientName",     header: "Client",    render: d => d.clientName || "—" },
    { key: "referenceOrderNo", header: "Ref Order", render: d => d.referenceOrderNo || "—" },
    {
      key: "totalQuantity", header: "Total Qty", className: "text-right font-semibold",
      render: d => <span>{d.totalQuantity.toLocaleString("en-IN")}</span>,
    },
    {
      key: "lineCount", header: "Lines", className: "text-center",
      render: d => <span className="px-2 py-0.5 rounded-full bg-muted text-xs">{d.lineCount}</span>,
    },
    {
      key: "status", header: "Status",
      render: d => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status] || "bg-gray-100 text-gray-700"}`}>
          {d.status === "Dispatched" && <Truck size={10} />}
          {d.status === "Delivered"  && <CheckCircle2 size={10} />}
          {d.status === "Cancelled"  && <XCircle size={10} />}
          {d.status}
        </span>
      ),
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <DataTable
        title="Dispatch Management"
        subtitle="Record outward stock dispatches to clients and stores — enter quantities per size run"
        columns={columns}
        data={dispatches}
        totalCount={totalCount}
        pageNumber={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={() => { resetForm(); setModalOpen(true); }}
        onEdit={handleView}
        onExport={() => {}}
        addLabel="New Dispatch"
        loading={loading}
        keyExtractor={d => d.dispatchId}
      />

      {/* ── Create Dispatch Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Dispatch"
        subtitle="Create an outward stock dispatch — enter quantities across the size run per article"
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

          {/* Store + Reference */}
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
              <label className="block text-sm font-medium mb-1.5">Reference Order No</label>
              <input type="text" value={formRefOrderNo} onChange={e => setFormRefOrderNo(e.target.value)}
                placeholder="e.g., ORD-2026-001"
                className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          {/* Transport details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Transport Mode</label>
              <select value={formTransportMode} onChange={e => setFormTransportMode(e.target.value)}
                className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Select Mode</option>
                {TRANSPORT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Vehicle No</label>
              <input type="text" value={formVehicleNo} onChange={e => setFormVehicleNo(e.target.value)}
                placeholder="e.g., MH12AB1234"
                className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Logistics Partner</label>
              <input type="text" value={formLogistics} onChange={e => setFormLogistics(e.target.value)}
                placeholder="Transporter name"
                className="w-full px-3 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          {/* ── Article Size Run Entry ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Articles & Quantities <span className="text-red-500">*</span></label>
              <span className="text-xs text-muted-foreground">Select article → enter size run quantities</span>
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
                <div className="px-3 py-2 bg-primary/5 border-b flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">
                    SIZE RUN — {entryArticle?.articleCode}
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
                          {/* Available stock row */}
                          <tr className="border-t">
                            <td className="px-3 py-1.5 text-xs text-muted-foreground">Available</td>
                            {sizeRun.map(s => (
                              <td key={s.euroSize} className={`px-2 py-1.5 text-center text-xs tabular-nums ${s.closingStock > 0 ? "text-green-700 font-medium" : "text-muted-foreground"}`}>
                                {s.closingStock}
                              </td>
                            ))}
                            <td className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">
                              {sizeRun.reduce((n, s) => n + s.closingStock, 0)}
                            </td>
                          </tr>
                          {/* Dispatch qty row */}
                          <tr className="border-t bg-blue-50/30">
                            <td className="px-3 py-2 text-xs font-semibold text-blue-700">Dispatch Qty</td>
                            {sizeRun.map(s => {
                              const qty  = parseInt(s.qty) || 0;
                              const over = qty > s.closingStock;
                              return (
                                <td key={s.euroSize} className="px-1 py-2 text-center">
                                  <input
                                    type="number" min="0" max={s.closingStock}
                                    value={s.qty}
                                    onChange={e => setSizeQty(s.euroSize, e.target.value)}
                                    className={`w-14 px-1 py-1 text-center text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary ${over ? "border-red-400 bg-red-50 text-red-700" : "border-input bg-white"}`}
                                    placeholder="0"
                                  />
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-right text-sm font-bold text-primary tabular-nums">
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
                          : "Enter quantities per size above"}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => { setEntryArticleId(""); setSizeRun([]); }}
                          className="px-3 py-1.5 text-xs border rounded-lg hover:bg-muted">Clear</button>
                        <button onClick={addArticle} disabled={!entryValid}
                          className="px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50">
                          Add Article
                        </button>
                      </div>
                    </div>
                  </>
                ) : !sizeRunLoading ? (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No stock found for this article in the selected warehouse.
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
                  const gt   = group.sizes.reduce((n, s) => n + s.quantity, 0);
                  const over = group.sizes.some(s => s.quantity > s.availableStock);
                  return (
                    <div key={group.articleId} className={`border rounded-lg overflow-hidden ${over ? "border-red-300" : ""}`}>
                      <div className={`flex items-center justify-between px-3 py-2 ${over ? "bg-red-50" : "bg-muted/20"}`}>
                        <span className="text-xs font-semibold">{group.articleName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium">{gt.toLocaleString()} pcs</span>
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
                                const o = s.quantity > s.availableStock;
                                return (
                                  <td key={s.euroSize} className={`px-2 py-2 text-center font-semibold tabular-nums ${o ? "text-red-700" : ""}`}>
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
                  <span>Grand Total</span>
                  <span>{totalQty.toLocaleString()} pcs</span>
                </div>
              </div>
            ) : !entryArticleId ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                <Package size={24} className="mx-auto mb-2 opacity-40" />
                Select an article above and enter dispatch quantities across the size run.
              </div>
            ) : null}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 border border-input rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50">
              {saving
                ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />Saving…</>
                : <><Truck size={14} />Create Dispatch</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── View Detail Modal ── */}
      {viewDetail && (
        <Modal
          isOpen={viewModal}
          onClose={() => setViewModal(false)}
          title={`Dispatch: ${viewDetail.dispatchNumber}`}
          subtitle={`${viewDetail.warehouseName} · ${formatDate(viewDetail.dispatchDate)}`}
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
                { label: "Client",    value: viewDetail.clientName || "—" },
                { label: "Transport", value: viewDetail.transportMode || "—" },
                { label: "Vehicle",   value: viewDetail.vehicleNo || "—" },
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
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/20">
                        <span className="text-xs font-semibold">{g.code} — {g.name}</span>
                        <span className="text-xs font-medium text-muted-foreground">{gt.toLocaleString()} pcs</span>
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
                              {g.sizes.map(s => <td key={s.euroSize} className="px-2 py-2 text-center font-semibold">{s.qty}</td>)}
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
            {NEXT_STATUSES[viewDetail.status] && (
              <div className="border border-dashed rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Update Status</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select value={pendingStatus} onChange={e => setPendingStatus(e.target.value)}
                    className="flex-1 px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Select new status</option>
                    {NEXT_STATUSES[viewDetail.status].map(s => <option key={s} value={s}>{s}</option>)}
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
