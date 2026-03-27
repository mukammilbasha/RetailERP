"use client";

import { useState, useEffect, useCallback } from "react";
import api, { type ApiResponse } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

interface DeliveryNote {
  deliveryNoteId: string;
  deliveryNo: string;
  deliveryDate: string;
  invoiceNo: string;
  clientName: string;
  storeName: string;
  totalCartons: number;
  totalPairs: number;
  transportMode: string;
  vehicleNo: string;
  status: string;
  cartons: CartonDetail[];
}

interface CartonDetail {
  cartonNumber: string;
  pairsPerCarton: number;
  articleName: string;
  colourName: string;
}

export default function DeliveryNotesPage() {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);

  const pageSize = 25;
  const totalPages = Math.ceil(totalCount / pageSize);
  const from = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, totalCount);

  const fetchDeliveryNotes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/invoices", {
        params: {
          searchTerm: searchTerm || undefined,
          pageNumber: page,
          pageSize,
          hasPackingList: true,
        },
      });
      if (data.success) {
        const items = (data.data?.items || []).map((inv: any) => ({
          ...inv,
          deliveryNoteId: inv.deliveryNoteId || inv.invoiceId || "",
          deliveryNo: inv.deliveryNo || inv.invoiceNumber || inv.invoiceNo || "",
          deliveryDate: inv.deliveryDate || inv.invoiceDate || null,
          invoiceNo: inv.invoiceNumber || inv.invoiceNo || "",
        }));
        setDeliveryNotes(items);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setDeliveryNotes([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    fetchDeliveryNotes();
  }, [fetchDeliveryNotes]);

  const openDetail = async (note: DeliveryNote) => {
    setSelectedNote(note);
    setDetailModalOpen(true);
    // Fetch carton details if not already loaded
    if (!note.cartons || note.cartons.length === 0) {
      try {
        const { data } = await api.get<ApiResponse<any>>(
          `/api/invoices/${note.deliveryNoteId}/delivery`
        );
        if (data.success && data.data) {
          setSelectedNote((prev) =>
            prev ? { ...prev, cartons: data.data.cartons || [] } : prev
          );
        }
      } catch {
        // If delivery detail API is unavailable, show empty carton list
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Delivery Notes</h1>
          <p className="text-sm text-muted-foreground">
            Auto-generated delivery notes from packing lists
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {}}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
          >
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
            placeholder="Search by invoice, client, store..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Delivery No
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Invoice No
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Client
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Store
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Cartons
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Total Pairs
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Transport
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Vehicle No
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : deliveryNotes.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                    No delivery notes found
                  </td>
                </tr>
              ) : (
                deliveryNotes.map((note) => (
                  <tr
                    key={note.deliveryNoteId}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium">
                      {note.deliveryNo}
                    </td>
                    <td className="px-4 py-3">{formatDate(note.deliveryDate)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{note.invoiceNo}</td>
                    <td className="px-4 py-3">{note.clientName}</td>
                    <td className="px-4 py-3">{note.storeName || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {note.totalCartons}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {note.totalPairs}
                    </td>
                    <td className="px-4 py-3">{note.transportMode || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {note.vehicleNo || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={note.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDetail(note)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="View Details"
                      >
                        <Eye size={14} className="text-muted-foreground" />
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
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Delivery Note: ${selectedNote?.deliveryNo || ""}`}
        subtitle={`Invoice: ${selectedNote?.invoiceNo || ""} | Client: ${selectedNote?.clientName || ""}`}
        size="lg"
      >
        {selectedNote && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-semibold">{formatDate(selectedNote.deliveryDate)}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Transport</p>
                <p className="text-sm font-semibold">
                  {selectedNote.transportMode || "N/A"}
                  {selectedNote.vehicleNo ? ` (${selectedNote.vehicleNo})` : ""}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-0.5">
                  <StatusBadge status={selectedNote.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Store</p>
                <p className="text-sm font-semibold">{selectedNote.storeName || "N/A"}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-sm font-semibold">
                  {selectedNote.totalCartons} cartons, {selectedNote.totalPairs} pairs
                </p>
              </div>
            </div>

            {/* Carton Breakdown */}
            <div>
              <h3 className="text-sm font-medium mb-2">Carton Breakdown</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Carton No
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Article
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Colour
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                        Pairs
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedNote.cartons && selectedNote.cartons.length > 0 ? (
                      selectedNote.cartons.map((carton, idx) => (
                        <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/20">
                          <td className="px-4 py-2 font-mono text-xs">{carton.cartonNumber}</td>
                          <td className="px-4 py-2">{carton.articleName || "-"}</td>
                          <td className="px-4 py-2">{carton.colourName || "-"}</td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {carton.pairsPerCarton}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                          No carton details available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
