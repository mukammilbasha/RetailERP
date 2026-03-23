"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Footprints, ShoppingBag } from "lucide-react";
import api, { type ApiResponse } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils";
import { FieldError } from "@/components/ui/field-error";
import {
  required,
  minLength,
  maxLength,
  positiveNumber,
  hasErrors,
  type ValidationError,
} from "@/lib/validators";

/* ---------- types ---------- */
interface Article {
  articleId: string;
  articleCode: string;
  articleName: string;
  color: string;
  brandName: string;
  segmentName: string;
  categoryName: string;
  subCategoryName: string;
  style: string;
  last: string;
  hsnCode: string;
  mrp: number;
  cbd: number;
  isSizeBased: boolean;
  isActive: boolean;
  imageUrl?: string;
  launchDate?: string;
  seasonId?: string;
  groupId?: string;
  segmentId?: string;
  subSegmentId?: string;
  genderId?: string;
  brandId?: string;
  categoryId?: string;
  subCategoryId?: string;
  uom?: string;
  fastener?: string;
  sole?: string;
  upperLeather?: string;
  liningLeather?: string;
  sizeRunFrom?: number;
  sizeRunTo?: number;
  dimensions?: string;
  security?: string;
}

interface DropdownItem {
  id: string;
  name: string;
  parentId?: string;
}

/* ---------- helpers ---------- */
const inputCls =
  "w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
const selectCls =
  "flex-1 px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
const addBtnCls =
  "px-3 py-2 border border-input rounded-lg hover:bg-muted text-sm font-medium transition-colors";
const sectionTitleCls =
  "text-xs font-semibold text-primary uppercase tracking-wider mb-3";

/** Returns segment badge color classes based on segment name */
function getSegmentBadgeColor(segmentName: string): string {
  const seg = (segmentName || "").toLowerCase();
  if (seg.includes("footwear")) return "bg-orange-100 text-orange-700";
  if (seg.includes("leather") && seg.includes("goods"))
    return "bg-green-100 text-green-700";
  if (seg.includes("belt")) return "bg-blue-100 text-blue-700";
  return "bg-purple-100 text-purple-700";
}

const emptyForm = {
  articleCode: "",
  articleName: "",
  imageUrl: "",
  launchDate: "",
  seasonId: "",
  groupId: "",
  segmentId: "",
  subSegmentId: "",
  genderId: "",
  brandId: "",
  categoryId: "",
  subCategoryId: "",
  uom: "PAIRS",
  hsnCode: "64039990",
  mrp: 0,
  cbd: 0,
  isSizeBased: true,
  isActive: true,
  color: "",
  style: "",
  fastener: "",
  last: "",
  sole: "",
  upperLeather: "",
  liningLeather: "",
  sizeRunFrom: 39,
  sizeRunTo: 46,
  dimensions: "",
  security: "",
};

/* ========== Quick-Add Mini Modal ========== */
function QuickAddModal({
  isOpen,
  onClose,
  title,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-sm mx-4 p-5">
        <h3 className="text-sm font-semibold mb-3">Add {title}</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Enter ${title.toLowerCase()} name`}
          className={inputCls}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={() => {
              if (name.trim()) {
                onSave(name.trim());
                setName("");
              }
            }}
            className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========== MAIN PAGE ========== */
export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<ValidationError>({});

  // Segment filter for DataTable
  const [segmentFilter, setSegmentFilter] = useState("All");

  // Dropdown data
  const [brands, setBrands] = useState<DropdownItem[]>([]);
  const [segments, setSegments] = useState<DropdownItem[]>([]);
  const [subSegments, setSubSegments] = useState<DropdownItem[]>([]);
  const [genders, setGenders] = useState<DropdownItem[]>([]);
  const [categories, setCategories] = useState<DropdownItem[]>([]);
  const [subCategories, setSubCategories] = useState<DropdownItem[]>([]);
  const [seasons, setSeasons] = useState<DropdownItem[]>([]);
  const [groups, setGroups] = useState<DropdownItem[]>([]);

  // Quick-add modal state
  const [quickAdd, setQuickAdd] = useState<{
    open: boolean;
    title: string;
    endpoint: string;
    fieldName: string;
    bodyKey: string;
    refreshFn: () => void;
  } | null>(null);

  /* ---- derived: selected segment id for API filter ---- */
  const selectedSegmentId = segmentFilter !== "All"
    ? segments.find((s) => s.name === segmentFilter)?.id
    : undefined;

  /* ---- fetch data ---- */
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse<any>>("/api/articles", {
        params: {
          searchTerm: search || undefined,
          pageNumber: page,
          pageSize: 25,
          segmentId: selectedSegmentId,
        },
      });
      if (data.success) {
        setArticles(data.data?.items || []);
        setTotalCount(data.data?.totalCount || 0);
      }
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedSegmentId]);

  const fetchDropdown = async (
    endpoint: string,
    setter: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    idKey: string,
    nameKey: string,
    parentKey?: string
  ) => {
    try {
      const { data } = await api.get<ApiResponse<any>>(endpoint, {
        params: { pageSize: 500 },
      });
      if (data.success) {
        const items = data.data?.items || data.data || [];
        setter(
          items.map((it: any) => ({
            id: it[idKey],
            name: it[nameKey],
            parentId: parentKey ? it[parentKey] : undefined,
          }))
        );
      }
    } catch {
      setter([]);
    }
  };

  const loadBrands = () => fetchDropdown("/api/brands", setBrands, "brandId", "brandName");
  const loadSegments = () => fetchDropdown("/api/segments", setSegments, "segmentId", "segmentName");
  const loadSubSegments = () =>
    fetchDropdown("/api/subsegments", setSubSegments, "subSegmentId", "subSegmentName", "segmentId");
  const loadGenders = () => fetchDropdown("/api/genders", setGenders, "genderId", "genderName");
  const loadCategories = () =>
    fetchDropdown("/api/categories", setCategories, "categoryId", "categoryName");
  const loadSubCategories = () =>
    fetchDropdown("/api/subcategories", setSubCategories, "subCategoryId", "subCategoryName", "categoryId");
  const loadSeasons = () => fetchDropdown("/api/seasons", setSeasons, "seasonId", "seasonName");
  const loadGroups = () => fetchDropdown("/api/groups", setGroups, "groupId", "groupName");

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    loadBrands();
    loadSegments();
    loadSubSegments();
    loadGenders();
    loadCategories();
    loadSubCategories();
    loadSeasons();
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Reset page when segment filter changes ---- */
  useEffect(() => {
    setPage(1);
  }, [segmentFilter]);

  /* ---- derived data ---- */
  const filteredSubSegments = subSegments.filter(
    (ss) => !form.segmentId || ss.parentId === form.segmentId
  );
  const filteredSubCategories = subCategories.filter(
    (sc) => !form.categoryId || sc.parentId === form.categoryId
  );

  const selectedSegmentName =
    segments.find((s) => s.id === form.segmentId)?.name || "";
  const isFootwear = selectedSegmentName.toLowerCase().includes("footwear");
  const isLeatherGoods =
    selectedSegmentName.toLowerCase().includes("leather") &&
    selectedSegmentName.toLowerCase().includes("goods");

  /* ---- UOM auto ---- */
  useEffect(() => {
    if (isFootwear) setForm((f) => ({ ...f, uom: "PAIRS" }));
    else if (isLeatherGoods) setForm((f) => ({ ...f, uom: "NOS" }));
    else setForm((f) => ({ ...f, uom: "NOS" }));
  }, [isFootwear, isLeatherGoods]);

  /* ---- CRUD actions ---- */
  const openAdd = () => {
    setEditingArticle(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (article: Article) => {
    setEditingArticle(article);
    setErrors({});
    setForm({
      articleCode: article.articleCode || "",
      articleName: article.articleName || "",
      imageUrl: article.imageUrl || "",
      launchDate: article.launchDate || "",
      seasonId: article.seasonId || "",
      groupId: article.groupId || "",
      segmentId: article.segmentId || "",
      subSegmentId: article.subSegmentId || "",
      genderId: article.genderId || "",
      brandId: article.brandId || "",
      categoryId: article.categoryId || "",
      subCategoryId: article.subCategoryId || "",
      uom: article.uom || "PAIRS",
      hsnCode: article.hsnCode || "",
      mrp: article.mrp || 0,
      cbd: article.cbd || 0,
      isSizeBased: article.isSizeBased ?? true,
      isActive: article.isActive ?? true,
      color: article.color || "",
      style: article.style || "",
      fastener: article.fastener || "",
      last: article.last || "",
      sole: article.sole || "",
      upperLeather: article.upperLeather || "",
      liningLeather: article.liningLeather || "",
      sizeRunFrom: article.sizeRunFrom || 39,
      sizeRunTo: article.sizeRunTo || 46,
      dimensions: article.dimensions || "",
      security: article.security || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const hsnError = (() => {
      const req = required(form.hsnCode, "HSN Code");
      if (req) return req;
      if (!/^\d{4,8}$/.test(form.hsnCode.trim())) return "HSN Code must be 4-8 digits";
      return "";
    })();

    const codeError = (() => {
      const req = required(form.articleCode, "Article Code");
      if (req) return req;
      const min = minLength(form.articleCode, 4, "Article Code");
      if (min) return min;
      const max = maxLength(form.articleCode, 20, "Article Code");
      if (max) return max;
      if (!/^[A-Za-z0-9\-]+$/.test(form.articleCode.trim())) return "Article Code must be alphanumeric";
      return "";
    })();

    const newErrors: ValidationError = {
      articleCode: codeError,
      articleName:
        required(form.articleName, "Article Name") ||
        minLength(form.articleName, 3, "Article Name"),
      mrp:     positiveNumber(form.mrp, "MRP"),
      hsnCode: hsnError,
    };

    if (hasErrors(newErrors)) {
      setErrors(newErrors);
      return;
    }

    try {
      if (editingArticle) {
        await api.put(`/api/articles/${editingArticle.articleId}`, form);
      } else {
        await api.post("/api/articles", form);
      }
      setModalOpen(false);
      fetchArticles();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save article");
    }
  };

  const handleDelete = async (article: Article) => {
    if (!confirm(`Delete article "${article.articleName}"?`)) return;
    try {
      await api.delete(`/api/articles/${article.articleId}`);
      fetchArticles();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete article");
    }
  };

  const handleQuickAdd = async (name: string) => {
    if (!quickAdd) return;
    try {
      await api.post(quickAdd.endpoint, { [quickAdd.bodyKey]: name, isActive: true });
      quickAdd.refreshFn();
      setQuickAdd(null);
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to add ${quickAdd.title}`);
    }
  };

  /* ---- columns (enhanced with segment-specific info) ---- */
  const columns: Column<Article>[] = useMemo(() => {
    const base: Column<Article>[] = [
      { key: "articleCode", header: "Code", className: "font-mono text-xs" },
      { key: "articleName", header: "Article Name" },
      { key: "color", header: "Colour" },
      {
        key: "segmentName",
        header: "Segment",
        render: (a) => {
          const badgeColor = getSegmentBadgeColor(a.segmentName);
          return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeColor}`}>
              {a.segmentName || a.categoryName || "-"}
            </span>
          );
        },
      },
      { key: "brandName", header: "Brand" },
      { key: "style", header: "Style" },
    ];

    // Segment-specific columns based on active filter
    const filterLower = segmentFilter.toLowerCase();
    const showFootwearCols =
      filterLower === "all" || filterLower.includes("footwear");
    const showLeatherGoodsCols =
      filterLower === "all" ||
      (filterLower.includes("leather") && filterLower.includes("goods"));

    if (showFootwearCols) {
      base.push({ key: "last", header: "Last" });
      base.push({ key: "sole", header: "Sole" });
      base.push({
        key: "sizeRange",
        header: "Size Range",
        render: (a) => {
          if (a.sizeRunFrom && a.sizeRunTo) return `${a.sizeRunFrom}-${a.sizeRunTo}`;
          return "-";
        },
      });
    }

    if (showLeatherGoodsCols) {
      base.push({ key: "dimensions", header: "Dimensions" });
      base.push({ key: "security", header: "Security" });
    }

    base.push(
      { key: "hsnCode", header: "HSN" },
      {
        key: "mrp",
        header: "MRP",
        render: (a) => formatCurrency(a.mrp),
        className: "text-right",
      },
      {
        key: "cbd",
        header: "CBD",
        render: (a) => formatCurrency(a.cbd),
        className: "text-right",
      },
      {
        key: "isSizeBased",
        header: "Size",
        render: (a) => <StatusBadge status={a.isSizeBased ? "Yes" : "No"} />,
      }
    );

    return base;
  }, [segmentFilter]);

  /* ---- helper for form update ---- */
  const setField = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  /* ---- render ---- */
  return (
    <>
      {/* Segment Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {["All", ...segments.map((s) => s.name)].map((seg) => (
          <button
            key={seg}
            onClick={() => setSegmentFilter(seg)}
            className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
              segmentFilter === seg
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-muted"
            }`}
          >
            {seg}
          </button>
        ))}
      </div>

      <DataTable
        title="Articles"
        subtitle="Manage product articles across all categories"
        columns={columns}
        data={articles}
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
        addLabel="Add Article"
        loading={loading}
        keyExtractor={(a) => a.articleId}
      />

      {/* ---- Article Form Modal ---- */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingArticle ? "Edit Article" : "Add New Article"}
        subtitle={
          editingArticle
            ? "Update article details"
            : "Add a new product article to the catalog"
        }
        size="xl"
      >
        <div className="max-h-[90vh] overflow-y-auto space-y-6">
          {/* Segment Visual Indicator Banner */}
          {isFootwear && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-orange-50 border border-orange-200">
              <Footprints size={20} className="text-orange-600 shrink-0" />
              <span className="text-sm font-semibold text-orange-700">
                Footwear Article
              </span>
            </div>
          )}
          {isLeatherGoods && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-200">
              <ShoppingBag size={20} className="text-green-600 shrink-0" />
              <span className="text-sm font-semibold text-green-700">
                Leather Goods Article
              </span>
            </div>
          )}

          {/* Row 1: Code, Name, Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Article Code *</label>
              <input
                type="text"
                placeholder="FW-004"
                value={form.articleCode}
                onChange={(e) => setField("articleCode", e.target.value)}
                className={errors.articleCode ? `${inputCls} border-destructive` : inputCls}
              />
              <FieldError error={errors.articleCode} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Article Name *</label>
              <input
                type="text"
                placeholder="Premium Derby Shoes"
                value={form.articleName}
                onChange={(e) => setField("articleName", e.target.value)}
                className={errors.articleName ? `${inputCls} border-destructive` : inputCls}
              />
              <FieldError error={errors.articleName} />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium mb-1.5">Image</label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground cursor-pointer hover:border-primary/40 transition-colors">
                {form.imageUrl ? (
                  <span className="text-xs text-primary truncate block">{form.imageUrl}</span>
                ) : (
                  "Click to upload"
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Launch Date, Season, Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Launch Date</label>
              <input
                type="date"
                value={form.launchDate}
                onChange={(e) => setField("launchDate", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Season *</label>
              <div className="flex gap-2">
                <select
                  value={form.seasonId}
                  onChange={(e) => setField("seasonId", e.target.value)}
                  className={selectCls}
                >
                  <option value="">Select Season</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className={addBtnCls}
                  onClick={() =>
                    setQuickAdd({
                      open: true,
                      title: "Season",
                      endpoint: "/api/seasons",
                      fieldName: "seasonId",
                      bodyKey: "name",
                      refreshFn: loadSeasons,
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium mb-1.5">Group *</label>
              <div className="flex gap-2">
                <select
                  value={form.groupId}
                  onChange={(e) => setField("groupId", e.target.value)}
                  className={selectCls}
                >
                  <option value="">Select Group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className={addBtnCls}
                  onClick={() =>
                    setQuickAdd({
                      open: true,
                      title: "Group",
                      endpoint: "/api/groups",
                      fieldName: "groupId",
                      bodyKey: "name",
                      refreshFn: loadGroups,
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* SEGMENT & CLASSIFICATION */}
          <div>
            <h3 className={sectionTitleCls}>Segment &amp; Classification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Segment *</label>
                <div className="flex gap-2">
                  <select
                    value={form.segmentId}
                    onChange={(e) => {
                      setField("segmentId", e.target.value);
                      setField("subSegmentId", "");
                    }}
                    className={selectCls}
                  >
                    <option value="">Select Segment</option>
                    {segments.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={addBtnCls}
                    onClick={() =>
                      setQuickAdd({
                        open: true,
                        title: "Segment",
                        endpoint: "/api/segments",
                        fieldName: "segmentId",
                        bodyKey: "name",
                        refreshFn: loadSegments,
                      })
                    }
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Gender *</label>
                <div className="flex gap-2">
                  <select
                    value={form.genderId}
                    onChange={(e) => setField("genderId", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Select Gender</option>
                    {genders.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={addBtnCls}
                    onClick={() =>
                      setQuickAdd({
                        open: true,
                        title: "Gender",
                        endpoint: "/api/genders",
                        fieldName: "genderId",
                        bodyKey: "name",
                        refreshFn: loadGenders,
                      })
                    }
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium mb-1.5">UOM</label>
                <input
                  type="text"
                  value={form.uom}
                  readOnly
                  className={`${inputCls} bg-muted cursor-not-allowed`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Sub Segment *</label>
                <div className="flex gap-2">
                  <select
                    value={form.subSegmentId}
                    onChange={(e) => setField("subSegmentId", e.target.value)}
                    disabled={!form.segmentId}
                    className={selectCls}
                  >
                    <option value="">
                      {form.segmentId ? "Select Sub Segment" : "Select Segment first"}
                    </option>
                    {filteredSubSegments.map((ss) => (
                      <option key={ss.id} value={ss.id}>{ss.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={addBtnCls}
                    onClick={() =>
                      setQuickAdd({
                        open: true,
                        title: "Sub Segment",
                        endpoint: "/api/subsegments",
                        fieldName: "subSegmentId",
                        bodyKey: "name",
                        refreshFn: loadSubSegments,
                      })
                    }
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Brand *</label>
                <div className="flex gap-2">
                  <select
                    value={form.brandId}
                    onChange={(e) => setField("brandId", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Select Brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={addBtnCls}
                    onClick={() =>
                      setQuickAdd({
                        open: true,
                        title: "Brand",
                        endpoint: "/api/brands",
                        fieldName: "brandId",
                        bodyKey: "name",
                        refreshFn: loadBrands,
                      })
                    }
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium mb-1.5">HSN Code *</label>
                <input
                  type="text"
                  value={form.hsnCode}
                  onChange={(e) => setField("hsnCode", e.target.value)}
                  className={errors.hsnCode ? `${inputCls} border-destructive` : inputCls}
                />
                <FieldError error={errors.hsnCode} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Category *</label>
                <div className="flex gap-2">
                  <select
                    value={form.categoryId}
                    onChange={(e) => {
                      setField("categoryId", e.target.value);
                      setField("subCategoryId", "");
                    }}
                    className={selectCls}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={addBtnCls}
                    onClick={() =>
                      setQuickAdd({
                        open: true,
                        title: "Category",
                        endpoint: "/api/categories",
                        fieldName: "categoryId",
                        bodyKey: "name",
                        refreshFn: loadCategories,
                      })
                    }
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Sub Category *</label>
                <div className="flex gap-2">
                  <select
                    value={form.subCategoryId}
                    onChange={(e) => setField("subCategoryId", e.target.value)}
                    disabled={!form.categoryId}
                    className={selectCls}
                  >
                    <option value="">
                      {form.categoryId ? "Select Sub Category" : "Select Category first"}
                    </option>
                    {filteredSubCategories.map((sc) => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={addBtnCls}
                    onClick={() =>
                      setQuickAdd({
                        open: true,
                        title: "Sub Category",
                        endpoint: "/api/subcategories",
                        fieldName: "subCategoryId",
                        bodyKey: "name",
                        refreshFn: loadSubCategories,
                      })
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* PRICING */}
          <div>
            <h3 className={sectionTitleCls}>Pricing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-1.5">MRP (&#8377;) *</label>
                <input
                  type="number"
                  value={form.mrp || ""}
                  onChange={(e) => setField("mrp", +e.target.value)}
                  className={errors.mrp ? `${inputCls} border-destructive` : inputCls}
                />
                <FieldError error={errors.mrp} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">CBD (&#8377;)</label>
                <input
                  type="number"
                  value={form.cbd || ""}
                  onChange={(e) => setField("cbd", +e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex items-center gap-3 pb-1">
                <button
                  type="button"
                  onClick={() => setField("isSizeBased", !form.isSizeBased)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.isSizeBased ? "bg-primary" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.isSizeBased ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm">Size Based</span>
              </div>
              <div className="flex items-center gap-3 pb-1">
                <button
                  type="button"
                  onClick={() => setField("isActive", !form.isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.isActive ? "bg-primary" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm">Active</span>
              </div>
            </div>
          </div>

          {/* PRODUCT DETAILS -- conditional on segment */}
          <div>
            <h3 className={sectionTitleCls}>Product Details</h3>

            {/* Common: Colour, Style, Fastener */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Colour *</label>
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => setField("color", e.target.value)}
                  placeholder="Black"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Style</label>
                <input
                  type="text"
                  value={form.style}
                  onChange={(e) => setField("style", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium mb-1.5">Fastener</label>
                <input
                  type="text"
                  value={form.fastener}
                  onChange={(e) => setField("fastener", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Footwear-specific fields */}
            {isFootwear && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Last</label>
                    <input
                      type="text"
                      value={form.last}
                      onChange={(e) => setField("last", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Sole</label>
                    <input
                      type="text"
                      value={form.sole}
                      onChange={(e) => setField("sole", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-medium mb-1.5">Upper Leather</label>
                    <input
                      type="text"
                      value={form.upperLeather}
                      onChange={(e) => setField("upperLeather", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Lining Leather</label>
                    <input
                      type="text"
                      value={form.liningLeather}
                      onChange={(e) => setField("liningLeather", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Size Run From (Euro)</label>
                    <select
                      value={form.sizeRunFrom}
                      onChange={(e) => setField("sizeRunFrom", +e.target.value)}
                      className={inputCls}
                    >
                      {Array.from({ length: 16 }, (_, i) => 35 + i).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-medium mb-1.5">Size Run To (Euro)</label>
                    <select
                      value={form.sizeRunTo}
                      onChange={(e) => setField("sizeRunTo", +e.target.value)}
                      className={inputCls}
                    >
                      {Array.from({ length: 16 }, (_, i) => 35 + i).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Leather Goods-specific fields */}
            {isLeatherGoods && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Dimensions (L x B x W)
                  </label>
                  <input
                    type="text"
                    value={form.dimensions}
                    onChange={(e) => setField("dimensions", e.target.value)}
                    placeholder="30 x 20 x 10 cm"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Security</label>
                  <input
                    type="text"
                    value={form.security}
                    onChange={(e) => setField("security", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            {/* Fallback when no segment or other segment */}
            {!isFootwear && !isLeatherGoods && form.segmentId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Last</label>
                  <input
                    type="text"
                    value={form.last}
                    onChange={(e) => setField("last", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Sole</label>
                  <input
                    type="text"
                    value={form.sole}
                    onChange={(e) => setField("sole", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium mb-1.5">Upper Leather</label>
                  <input
                    type="text"
                    value={form.upperLeather}
                    onChange={(e) => setField("upperLeather", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              {editingArticle ? "Update Article" : "Add Article"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Quick-Add Mini Modal */}
      <QuickAddModal
        isOpen={!!quickAdd?.open}
        onClose={() => setQuickAdd(null)}
        title={quickAdd?.title || ""}
        onSave={handleQuickAdd}
      />
    </>
  );
}
