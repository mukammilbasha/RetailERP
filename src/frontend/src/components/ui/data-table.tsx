"use client";

import { useState } from "react";
import { Search, Filter, Download, ChevronLeft, ChevronRight, Edit2, Trash2, RefreshCw } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  title: string;
  subtitle?: string;
  columns: Column<T>[];
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSearch: (term: string) => void;
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onImport?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  addLabel?: string;
  loading?: boolean;
  keyExtractor: (item: T) => string;
  /** Column keys to display on mobile cards. Defaults to first 4 columns. */
  mobileColumns?: string[];
}

export function DataTable<T>({
  title, subtitle, columns, data, totalCount, pageNumber, pageSize,
  onPageChange, onSearch, onAdd, onEdit, onDelete, onImport, onExport, onRefresh,
  addLabel = "Add", loading = false, keyExtractor, mobileColumns,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const totalPages = Math.ceil(totalCount / pageSize);
  const from = (pageNumber - 1) * pageSize + 1;
  const to = Math.min(pageNumber * pageSize, totalCount);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  // Determine which columns to show on mobile cards
  const mobileColumnKeys = mobileColumns || columns.slice(0, 4).map((c) => c.key);
  const mobileVisibleColumns = columns.filter((c) => mobileColumnKeys.includes(c.key));

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header - stacks vertically on mobile */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button onClick={onRefresh} className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors" title="Refresh">
              <RefreshCw size={14} />
            </button>
          )}
          {onImport && (
            <button onClick={onImport} className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">
              <Download size={14} /> Import
            </button>
          )}
          {onAdd && (
            <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
              + {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* Search and Filter Bar - full width on mobile */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">
            <Filter size={14} /> Filter
          </button>
          {onExport && (
            <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">
              <Download size={14} /> Export
            </button>
          )}
        </div>
      </div>

      {/* ================================================================
          Desktop & Tablet: Table view (hidden on mobile < 640px)
          ================================================================ */}
      <div className="hidden sm:block border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm md:text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                {columns.map((col) => (
                  <th key={col.key} className={`px-3 md:px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap ${col.className || ""}`}>
                    {col.header}
                  </th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="px-3 md:px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider w-24">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-muted-foreground">
                    No records found
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={keyExtractor(item)} className="border-b hover:bg-muted/30 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className={`px-3 md:px-4 py-3 ${col.className || ""}`}>
                        {col.render ? col.render(item) : String((item as any)[col.key] ?? "")}
                      </td>
                    ))}
                    {(onEdit || onDelete) && (
                      <td className="px-3 md:px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onEdit && (
                            <button onClick={() => onEdit(item)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Edit">
                              <Edit2 size={14} className="text-muted-foreground" />
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={() => onDelete(item)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors" title="Delete">
                              <Trash2 size={14} className="text-destructive" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop/Tablet Pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="hidden md:inline">Rows per page:</span>
            <select className="hidden md:inline border rounded px-2 py-1 text-xs">
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
            <span className="text-xs sm:text-sm">{from}-{to} of {totalCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onPageChange(pageNumber - 1)} disabled={pageNumber <= 1} className="p-1 rounded hover:bg-muted disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs">Page {pageNumber} of {totalPages || 1}</span>
            <button onClick={() => onPageChange(pageNumber + 1)} disabled={pageNumber >= totalPages} className="p-1 rounded hover:bg-muted disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================
          Mobile: Card-based list view (visible only on < 640px)
          ================================================================ */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            Loading...
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No records found
          </div>
        ) : (
          data.map((item) => (
            <div
              key={keyExtractor(item)}
              className="border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors"
            >
              {/* Card content: stacked columns with labels */}
              <div className="space-y-2">
                {mobileVisibleColumns.map((col, idx) => {
                  const value = col.render
                    ? col.render(item)
                    : String((item as any)[col.key] ?? "");
                  return (
                    <div key={col.key} className={idx === 0 ? "" : ""}>
                      {idx === 0 ? (
                        // First column displayed as the card "title"
                        <div className="font-medium text-sm">{value}</div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">
                            {col.header}
                          </span>
                          <span className="text-xs text-right">{value}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Card actions */}
              {(onEdit || onDelete) && (
                <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md hover:bg-destructive/10 transition-colors text-destructive"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Mobile Pagination: simplified prev/next only */}
        {data.length > 0 && (
          <div className="flex items-center justify-between px-1 py-2 text-sm">
            <button
              onClick={() => onPageChange(pageNumber - 1)}
              disabled={pageNumber <= 1}
              className="flex items-center gap-1 px-3 py-2 text-xs border rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="text-xs text-muted-foreground">
              {from}-{to} of {totalCount}
            </span>
            <button
              onClick={() => onPageChange(pageNumber + 1)}
              disabled={pageNumber >= totalPages}
              className="flex items-center gap-1 px-3 py-2 text-xs border rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
