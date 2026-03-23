"use client";

import { useState, useEffect, useCallback } from "react";
import { Truck, Package, AlertCircle, CheckCircle2 } from "lucide-react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";

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
  lines: DispatchLine[];
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
  availableStock: number;
}

const STATUS_COLORS: Record<string, string> = {
  Dispatched: "bg-blue-100 text-blue-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

const TRANSPORT_MODES = ["Road", "Rail", "Air", "Sea", "Courier"];

export default function DispatchPage() {
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewDetail, setViewDetail] = useState<DispatchDetail | null>(null);
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
  const [formRefOrderNo, setFormRefOrderNo] = useState("");
  const [formTransportMode, setFormTransportMode] = useState("");
  const [formVehicleNo, setFormVehicleNo] = useState("");
  const [formLogistics, setFormLogistics] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Line item state
  const [lines, setLines] = useState<LineItem[]>([]);
  const [addingLine, setAddingLine] = useState(false);
  const [lineArticleId, setLineArticleId] = useState("");
  const [lineSize, setLineSize] = useState("");
  const [lineQty, setLineQty] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredStores = stores.filter(
    (s) => !formClientId || s.clientId === formClientId
  );
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);

  const fetchDispatches = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/stock/dispatch", {
        params: {
          search: search || undefined,
          pageNumber: page,
          pageSize: 25,
        },
      });
      if (data.success) {
        setDispatches(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setDispatches([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchDispatches();
  }, [fetchDispatches]);

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
        // silently fail — dropdowns may be partially populated
      }
    };
    loadDropdowns();
  }, []);

  // Fetch size-wise stock when warehouse + article are both selected
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
    const stock = sizeStocks.find((s) => s.euroSize === lineSize);
    setLines((prev) => [
      ...prev,
      {
        articleId: lineArticleId,
        articleName: art
          ? `${art.articleCode} — ${art.articleName}`
          : lineArticleId,
        euroSize: lineSize,
        quantity: parseInt(lineQty),
        availableStock: stock?.closingStock ?? 0,
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
    setFormRefOrderNo("");
    setFormTransportMode("");
    setFormVehicleNo("");
    setFormLogistics("");
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

  const handleView = async (d: DispatchRecord) => {
    try {
      const { data } = await api.get<ApiResponse<DispatchDetail>>(
        `/api/stock/dispatch/${d.dispatchId}`
      );
      if (data.success && data.data) {
        setViewDetail(data.data);
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
    if (lines.length === 0) {
      setError("Add at least one line item.");
      return;
    }
    const overAllocated = lines.filter((l) => l.quantity > l.availableStock);
    if (overAllocated.length > 0) {
      setError(
        `Insufficient stock for: ${overAllocated
          .map((l) => `${l.articleName} (Size ${l.euroSize})`)
          .join(", ")}`
      );
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/stock/dispatch", {
        warehouseId: formWarehouseId,
        clientId: formClientId || undefined,
        storeId: formStoreId || undefined,
        referenceOrderNo: formRefOrderNo || undefined,
        transportMode: formTransportMode || undefined,
        vehicleNo: formVehicleNo || undefined,
        logisticsPartner: formLogistics || undefined,
        notes: formNotes || undefined,
        lines: lines.map((l) => ({
          articleId: l.articleId,
          euroSize: l.euroSize,
          quantity: l.quantity,
        })),
      });
      setSuccess("Dispatch created successfully.");
      setModalOpen(false);
      fetchDispatches();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save dispatch.");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<DispatchRecord>[] = [
    {
      key: "dispatchNumber",
      header: "Dispatch No",
      className: "font-mono text-xs font-semibold text-primary",
    },
    {
      key: "dispatchDate",
      header: "Date",
      render: (d) => formatDate(d.dispatchDate),
    },
    { key: "warehouseName", header: "Warehouse" },
    {
      key: "clientName",
      header: "Client",
      render: (d) => d.clientName || "—",
    },
    {
      key: "referenceOrderNo",
      header: "Ref Order",
      render: (d) => d.referenceOrderNo || "—",
    },
    {
      key: "totalQuantity",
      header: "Total Qty",
      className: "text-right font-semibold",
      render: (d) => (
        <span>{d.totalQuantity.toLocaleString("en-IN")}</span>
      ),
    },
    {
      key: "lineCount",
      header: "Lines",
      className: "text-center",
      render: (d) => (
        <span className="px-2 py-0.5 rounded-full bg-muted text-xs">
          {d.lineCount}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (d) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            STATUS_COLORS[d.status] || "bg-gray-100 text-gray-700"
          }`}
        >
          {d.status === "Dispatched" && <Truck size={10} />}
          {d.status === "Delivered" && <CheckCircle2 size={10} />}
          {d.status}
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
        title="Dispatch Management"
        subtitle="Record outward stock dispatches to clients and stores"
        columns={columns}
        data={dispatches}
        totalCount={totalCount}
        pageNumber={page}
        pageSize={25}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={openAdd}
        onEdit={handleView}
        onExport={() => {}}
        addLabel="New Dispatch"
        loading={loading}
        keyExtractor={(d) => d.dispatchId}
      />

      {/* Add Dispatch Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Dispatch"
        subtitle="Create an outward stock dispatch"
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

          {/* Store + Reference Order */}
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
                Reference Order No
              </label>
              <input
                type="text"
                value={formRefOrderNo}
                onChange={(e) => setFormRefOrderNo(e.target.value)}
                placeholder="e.g., ORD-2026-001"
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>
          </div>

          {/* Transport + Vehicle + Logistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Transport Mode
              </label>
              <select
                value={formTransportMode}
                onChange={(e) => setFormTransportMode(e.target.value)}
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              >
                <option value="">Select Mode</option>
                {TRANSPORT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Vehicle No
              </label>
              <input
                type="text"
                value={formVehicleNo}
                onChange={(e) => setFormVehicleNo(e.target.value)}
                placeholder="e.g., MH12AB1234"
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Logistics Partner
              </label>
              <input
                type="text"
                value={formLogistics}
                onChange={(e) => setFormLogistics(e.target.value)}
                placeholder="Transporter name"
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
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
                    {sizeStocks
                      .filter((s) => s.closingStock > 0)
                      .map((s) => (
                        <option key={s.euroSize} value={s.euroSize}>
                          Size {s.euroSize} (Avl: {s.closingStock})
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
                        Avl Stock
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">
                        Dispatch Qty
                      </th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => {
                      const overStock = l.quantity > l.availableStock;
                      return (
                        <tr
                          key={i}
                          className={`border-t ${overStock ? "bg-red-50" : ""}`}
                        >
                          <td className="px-3 py-2 font-medium text-xs">
                            {l.articleName}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-xs">
                            {l.euroSize}
                          </td>
                          <td
                            className={`px-3 py-2 text-right tabular-nums text-xs ${
                              overStock
                                ? "text-red-600 font-semibold"
                                : "text-green-700"
                            }`}
                          >
                            {l.availableStock}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-semibold tabular-nums text-xs ${
                              overStock ? "text-red-700" : ""
                            }`}
                          >
                            {overStock && (
                              <AlertCircle
                                size={12}
                                className="inline mr-1 text-red-500"
                              />
                            )}
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
                      );
                    })}
                    <tr className="border-t bg-muted/30 font-semibold">
                      <td colSpan={3} className="px-3 py-2 text-sm">
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
                  <Truck size={14} />
                  Create Dispatch
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
          title={`Dispatch: ${viewDetail.dispatchNumber}`}
          subtitle={`${viewDetail.warehouseName} • ${formatDate(viewDetail.dispatchDate)}`}
          size="xl"
        >
          <div className="space-y-4">
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
                  label: "Client",
                  value: viewDetail.clientName || "—",
                },
                {
                  label: "Transport",
                  value: viewDetail.transportMode || "—",
                },
                {
                  label: "Vehicle",
                  value: viewDetail.vehicleNo || "—",
                },
              ].map((f) => (
                <div key={f.label} className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="font-medium text-sm mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>

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

            {viewDetail.notes && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{viewDetail.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
