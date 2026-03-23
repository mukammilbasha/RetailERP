# RetailERP — UI Screens & Page Reference

> **Version:** 1.0.0 | **Updated:** March 2026
> Complete screen-by-screen reference for all modules.

---

## Table of Contents

1. [Login & Setup](#1-login--setup)
2. [Dashboard (Home)](#2-dashboard-home)
3. [Masters Module](#3-masters-module)
   - Brands · Genders · Seasons · Segments · Sub-Segments
   - Categories · Sub-Categories · Groups · Sizes · Articles · SKUs · Barcode Labels
4. [Customers Module](#4-customers-module)
5. [Inventory Module](#5-inventory-module)
6. [Orders Module](#6-orders-module)
7. [Billing Module](#7-billing-module)
8. [Reports Module](#8-reports-module)
9. [Administration Module](#9-administration-module)
10. [Warehouse Module](#10-warehouse-module)
11. [Production Module](#11-production-module)

---

## 1. Login & Setup

### 1.1 Login Page (`/login`)

```
┌─────────────────────────────────────────────┐
│  ┌────────────────────────────────────────┐ │
│  │   EL CURIO · RetailERP                 │ │
│  │                                        │ │
│  │   Email ________________________________│ │
│  │   Password _____________________________│ │
│  │                                        │ │
│  │   [        Sign In          ]          │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Fields:**
| Field | Type | Validation |
|-------|------|-----------|
| Email | email input | Required, valid email format |
| Password | password input | Required, min 6 chars |

**Actions:** Sign In → redirects to `/dashboard`

---

### 1.2 Setup Wizard (`/setup`)

First-run wizard to configure company and admin account.

**Steps:**
1. Company Name & Logo
2. Admin account (name, email, password)
3. Database connection (auto-configured in Docker)
4. Finish & Launch

---

## 2. Dashboard (Home)

**Route:** `/dashboard`

### Layout Overview

```
┌── Sidebar ──┬──────────── Header (breadcrumb · search · notifications · user) ───────┐
│ EL CURIO    │ License Banner: RetailERP License · Valid until 31 Dec 2026 · 283 days  │
│ ─────────── ├───────────────────────────────────────────────────────────────────────── │
│ Dashboard   │                                                                          │
│ Masters ▼  │  ┌── Stats ──────────────────────────────────────────────────────────┐  │
│  Brands     │  │  Articles  Active Clients  Open Orders  Revenue  Stock  Invoices  │  │
│  Genders    │  └───────────────────────────────────────────────────────────────────┘  │
│  ...        │                                                                          │
│ Inventory ▼ │  ┌── Sales Chart ─────┐  ┌── Inventory ────┐                           │
│ Orders ▼   │  │  6-month area chart │  │  Donut chart    │                           │
│ Billing ▼  │  └────────────────────┘  └────────────────-┘                           │
│ Reports     │                                                                          │
│ Admin ▼    │  ┌── Recent Orders ──────────────────────────────────────────────────┐  │
│  Users      │  │  #  Client  Store  Date  Qty  Value  Status                       │  │
│  Roles      │  └───────────────────────────────────────────────────────────────────┘  │
│  Audit      │                                                                          │
│  Company    └───────────────────────────────────────────────────────────────────────── │
│  License    │                                                                          │
└─────────────┘                                                                          │
```

### KPI Cards

| Card | Description |
|------|-------------|
| Total Articles | Count of active article SKUs |
| Active Clients | Clients with recent orders |
| Open Orders | Unconfirmed/pending orders |
| Revenue (MTD) | Month-to-date billed amount |
| Warehouse Stock | Total pairs across all warehouses |
| Pending Invoices | Invoices awaiting payment |

---

## 3. Masters Module

### 3.1 Brands (`/dashboard/masters/brands`)

**Purpose:** Manage product brand master records.

```
┌─────────────────────────────────────────────────────────┐
│ Brands                                [+ Add Brand]      │
│ Manage product brands                                     │
│ ┌─────────────────────────────┐ [Filter] [Export]        │
│ │ 🔍 Search brands...          │                          │
│ └─────────────────────────────┘                          │
│ ┌───────────────────────────────────────────────────┐    │
│ │ BRAND NAME          STATUS    ACTIONS             │    │
│ │─────────────────────────────────────────────────  │    │
│ │ BagCraft             Active    [Edit] [Delete]     │    │
│ │ BeltKing             Active    [Edit] [Delete]     │    │
│ │ ClassicStep          Active    [Edit] [Delete]     │    │
│ └───────────────────────────────────────────────────┘    │
│ Rows per page: 25 ▼   1-6 of 6                           │
└─────────────────────────────────────────────────────────┘
```

**Add / Edit Modal:**

| Field | Type | Validation |
|-------|------|-----------|
| Brand Name | text | Required, 2–100 chars |
| Active | toggle | Default: ON |

**Delete:** Confirmation dialog before removal.

---

### 3.2 Genders (`/dashboard/masters/genders`)

**Purpose:** Gender classification (Men, Women, Kids, Unisex, Boys, Girls).

**Add / Edit Modal:**

| Field | Type | Validation |
|-------|------|-----------|
| Gender Name | text | Required |
| Active | toggle | Default: ON |

---

### 3.3 Seasons (`/dashboard/masters/seasons`)

**Purpose:** Define selling seasons (SS25, AW25, etc.) with date ranges.

**Add / Edit Modal:**

| Field | Type | Validation |
|-------|------|-----------|
| Season Name | text | Required, e.g. "SS 2025" |
| Start Date | date | Required |
| End Date | date | Required, must be after Start Date |
| Active | toggle | Default: ON |

**Validation:** End date is validated to be strictly after start date.

---

### 3.4 Segments (`/dashboard/masters/segments`)

**Purpose:** Product segments (Premium, Mid-Range, Economy, etc.).

**Add / Edit Modal:**

| Field | Type | Validation |
|-------|------|-----------|
| Segment Name | text | Required |
| Active | toggle | Default: ON |

---

### 3.5 Sub-Segments (`/dashboard/masters/sub-segments`)

**Purpose:** Sub-divisions within segments.

**Add / Edit Modal:**

| Field | Type | Validation |
|-------|------|-----------|
| Parent Segment | dropdown | Required |
| Sub-Segment Name | text | Required |
| Active | toggle | Default: ON |

---

### 3.6 Categories (`/dashboard/masters/categories`)

**Purpose:** Product categories (Footwear, Leather Goods, Accessories, etc.).

**Add / Edit Modal:**

| Field | Type | Validation |
|-------|------|-----------|
| Category Name | text | Required |
| Active | toggle | Default: ON |

---

### 3.7 Sub-Categories (`/dashboard/masters/sub-categories`)

**Purpose:** Sub-divisions within categories.

**Add / Edit Modal:**

| Field | Type | Validation |
|-------|------|-----------|
| Parent Category | dropdown | Required |
| Sub-Category Name | text | Required |
| Active | toggle | Default: ON |

---

### 3.8 Groups (`/dashboard/masters/groups`)

**Purpose:** Article groupings for production planning.

**Add / Edit Modal:**

| Field | Type | Validation |
|-------|------|-----------|
| Group Name | text | Required |
| Active | toggle | Default: ON |

---

### 3.9 Sizes (`/dashboard/masters/sizes`)

**Purpose:** Size master with multi-system size mapping (EU/UK/IND/USA/CM/Inch).

**Add / Edit Modal:**

| Field | Type | Validation |
|-------|------|-----------|
| Size Type | select | Footwear / Apparel |
| Applicable Genders | multi-select | Required |
| EU Size | number | Required for Footwear |
| UK Size | text | |
| IND Size | text | |
| USA Size | text | |
| CM | number | |
| Inch | number | |
| Active | toggle | Default: ON |

---

### 3.10 Articles (`/dashboard/masters/articles`)

**Purpose:** Full product article master — the core product catalog record.

**Add / Edit Form (Modal):**

#### Basic Info Tab
| Field | Type | Validation |
|-------|------|-----------|
| Article Code | text | Required, 4–20 chars, alphanumeric |
| Article Name | text | Required, min 3 chars |
| Article Image | file upload | PNG/JPG, max 2MB |
| Launch Date | date | |
| UOM | select | Pairs / Pieces |
| HSN Code | text | Required, 4–8 digits |
| MRP (₹) | number | Required, > 0 |
| CBD (₹) | number | Required, > 0 |

#### Classification Tab
| Field | Type | Validation |
|-------|------|-----------|
| Season | dropdown | Required |
| Group | dropdown | Required |
| Segment | dropdown | Required |
| Sub-Segment | dropdown | Required |
| Gender | dropdown | Required |
| Brand | dropdown | Required |
| Category | dropdown | Required |
| Sub-Category | dropdown | Required |

#### Footwear Details Tab (conditional)
| Field | Type |
|-------|------|
| Fastener Type | select (Lace/Velcro/Slip-on/Zip/Buckle/Elastic) |
| Last Type | text |
| Sole Material | select (PU/TPR/Rubber/EVA/Leather/Synthetic) |
| Upper Leather Type | select |
| Lining Type | select |
| Size-Based Pricing | toggle |

#### Security & Dimensions
| Field | Type |
|-------|------|
| Security Feature | text |
| Length (mm) | number |
| Width (mm) | number |
| Height (mm) | number |

---

### 3.11 SKUs (`/dashboard/masters/skus`)

**Purpose:** Auto-generated SKUs from articles. View-only with barcode display.

**View Modal:**
- Article code, name, brand, category
- Size, MRP, CBD
- Barcode (visual + EAN-13 number)
- Size variant selector

---

### 3.12 Barcode Labels (`/dashboard/masters/barcode-labels`)

**Purpose:** Generate and print barcode label sheets.

**Form Fields:**

| Field | Type | Validation |
|-------|------|-----------|
| SKU Selection | searchable dropdown | Required |
| Label Format | select (1×1, 2×4, 3×8, 4×10) | Required |
| Quantity | number | Required, ≥ 1 |
| Label Size | select (50×25mm, 38×25mm, custom) | |
| Print copies | number | Default: 1 |
| Include price | toggle | |
| Include barcode | toggle | Default: ON |

---

## 4. Customers Module

### 4.1 Clients (`/dashboard/customers/clients`)

**Purpose:** Business client master (distributors, wholesalers, retailers).

**Add / Edit Modal:**

| Field | Type | Validation |
|-------|------|-----------|
| Client Code | text | Required, uppercase |
| Client Name | text | Required |
| GSTIN | text | Optional, validates against GSTIN format (15 chars) |
| PAN | text | Optional, validates PAN format |
| Address Line 1 | text | Required |
| City | text | Required |
| State | dropdown (37 states/UTs) | Required |
| Pincode | text | Required, 6-digit |
| Phone | text | Required, 10-digit mobile |
| Email | email | Required, valid format |
| Credit Limit (₹) | number | ≥ 0 |
| Payment Terms (days) | number | ≥ 0 |
| Active | toggle | Default: ON |

---

### 4.2 Stores (`/dashboard/customers/stores`)

**Purpose:** Retail store locations linked to clients.

**Add / Edit Modal:**

| Field | Type | Validation |
|-------|------|-----------|
| Client | dropdown | Required |
| Store Code | text | Required, uppercase |
| Store Name | text | Required |
| Address | text | Required |
| City | text | Required |
| State | dropdown | Required |
| Pincode | text | Required |
| Contact Person | text | |
| Phone | text | 10-digit |
| Active | toggle | Default: ON |

---

## 5. Inventory Module

### 5.1 Stock Overview (`/dashboard/inventory/stock`)

**Purpose:** Real-time stock ledger per article/size/warehouse.

**Filters:** Warehouse, Article, Category, Date range, Summary/Detailed toggle

**Columns:**
| Column | Description |
|--------|-------------|
| Article | Code + Name |
| Opening | Opening stock (Qty + Value) |
| Received | GRN receipts |
| Issued | Dispatches |
| Returns | Inward returns |
| Closing | Current stock (highlighted red if negative) |

**Size-wise detail row** — expandable per article to show per-size breakdown.

---

### 5.2 Receipt / GRN (`/dashboard/inventory/receipt`)

**Purpose:** Record incoming goods (Goods Receipt Note).

**GRN Form:**

| Field | Type | Validation |
|-------|------|-----------|
| GRN Number | auto-generated | — |
| Warehouse | dropdown | Required |
| Receipt Date | date | Required, ≤ today |
| Supplier / Reference | text | |
| Barcode scan | scanner input | Auto-adds to item list |

**Item Table (per article):**

| Column | Description |
|--------|-------------|
| Article Code | Searchable dropdown |
| Article Name | Auto-filled |
| Size Run | EU size-wise qty input cells |
| Total Pairs | Auto-sum |
| Unit Rate (₹) | Required |
| Total Value | Auto-calculated |

**Actions:** Save Draft · Confirm Receipt · Print GRN

---

### 5.3 Dispatch (`/dashboard/inventory/dispatch`)

**Purpose:** Issue stock to clients/stores.

**Dispatch Form:**

| Field | Type | Validation |
|-------|------|-----------|
| Dispatch No | auto-generated | — |
| Warehouse | dropdown | Required |
| Client | dropdown | Required |
| Store | dropdown (filtered by client) | Required |
| Reference Order | dropdown | Optional |
| Dispatch Date | date | Required |
| Transport Mode | select (Road/Rail/Air/Sea) | |
| Vehicle No | text | |
| Logistics Partner | text | |

**Stock validation:** Prevents dispatch qty > available stock (shown inline per size).

---

### 5.4 Returns (`/dashboard/inventory/returns`)

**Purpose:** Record stock returned by clients.

**Form Fields:** Warehouse, Client, Store, Return Date, Return Reason, Item lines.

**Status Workflow:**
```
RECEIVED → INSPECTED → RESTOCKED
                     → REJECTED
```

---

### 5.5 Adjustment (`/dashboard/inventory/adjustment`)

**Purpose:** Correct stock discrepancies.

**Form Fields:**

| Field | Type | Validation |
|-------|------|-----------|
| Adjustment Type | select (Add / Remove) | Required |
| Warehouse | dropdown | Required |
| Reason | text | Required |
| Item lines | article + size + qty | All required |

**Approval Workflow:**
```
DRAFT → APPROVED → APPLIED
      → REJECTED (with reason)
```
**Remove type** validates qty ≤ available stock.

---

### 5.6 Transactions (`/dashboard/inventory/transactions`)

**Purpose:** Read-only ledger of all stock movements.

**Movement Types:** Purchase · Production · Sales · Return · Adjustment

**Filters:** Date range, Warehouse, Movement Type, Article

---

### 5.7 Stock Freeze (`/dashboard/inventory/stock-freeze`)

**Purpose:** Lock stock counts for period-end reporting.

---

## 6. Orders Module

### 6.1 Customer Orders (`/dashboard/orders`)

**Purpose:** View and manage all sales orders.

**Order Status Flow:**
```
DRAFT → CONFIRMED → PROCESSING → DISPATCHED → DELIVERED
      → CANCELLED
```

**Create Order Modal (XL):**

| Field | Type | Validation |
|-------|------|-----------|
| Order Number | auto-generated | — |
| Order Date | date | Required |
| Client | dropdown | Required |
| Store | dropdown (by client) | Required |
| Warehouse | dropdown | Required |
| Article | searchable dropdown | Required |
| Size-wise Qty | size-run table | At least 1 size qty > 0 |

**Stock Card** (inline): Shows Warehouse SOH · Customer SOH · Allocation · Closing per size, highlighted red if over-allocated.

---

### 6.2 Scan Entry (`/dashboard/orders/scan`)

**Purpose:** Fast order entry via barcode scanner.

**Workflow:**
1. Select Client, Store, Warehouse
2. Scan barcodes (format: `ARTICLECODE-SIZE`, e.g. `B26FW001-39`)
3. Each scan increments qty; duplicates auto-merged
4. Review grouped article table
5. Confirm order

**Flash notifications:** Success (green) / Error (red) per scan event.

**Running totals:** Articles · Total Pairs · Total Value (sticky bar)

---

### 6.3 Manual Entry (`/dashboard/orders/manual`)

**Purpose:** Manual order entry by article + size run.

**Order Header:**

| Field | Type | Validation |
|-------|------|-----------|
| Order Date | date | Required |
| Client | dropdown | Required |
| Store | dropdown | Required |
| Warehouse | dropdown | Required |
| Order Number | auto-generated | — |

**Size-Run Table (per article):**

| Column | Description |
|--------|-------------|
| Article | Searchable selector |
| Size 39–46 | Editable qty per EU size |
| WH SOH | Warehouse stock (read-only) |
| Cust SOH | Customer opening (read-only) |
| Allocation | Editable, validated ≤ WH SOH |
| Closing | Auto-calculated |

**Grand Total Bar (sticky):** Articles · Pairs · Value

---

### 6.4 Sales Channels (`/dashboard/orders/channels`)

**Purpose:** Channel-segmented order management (Website / Secondary / Offline / Direct).

**Tabs:** All Orders · Website · Secondary · Offline

**Channel Order Form:**

| Field | Type | Validation |
|-------|------|-----------|
| Sales Channel | select | Required |
| Client, Store, Warehouse | dropdowns | Required |
| Size-run table | per article | Qty ≤ Opening stock |
| Remarks | textarea | Optional |

---

## 7. Billing Module

### 7.1 Invoices (`/dashboard/billing/invoices`)

**Purpose:** Tax invoice creation with GST computation.

**Invoice Form:**

#### Header
| Field | Type | Validation |
|-------|------|-----------|
| Invoice No | auto-generated | — |
| Invoice Date | date | Required |
| PO Number | text | Optional |
| Client | dropdown | Required |
| Billing Address | auto-filled from client | Editable |
| Shipping Address | text | Required |
| Interstate | auto-detected from GSTIN state codes | — |

#### Line Items
| Column | Description |
|--------|-------------|
| HSN Code | Auto-filled from article |
| Description | Article name + size |
| Qty | Pairs |
| Unit Rate (₹) | MRP / CBD |
| Taxable Value | Qty × Rate |
| GST Rate | 5% / 12% / 18% based on MRP |
| SGST/CGST or IGST | Auto-calculated |
| Total | Taxable + Tax |

#### Footer
| Field | Description |
|-------|-------------|
| Subtotal | Sum of taxable values |
| Total GST | SGST+CGST or IGST |
| Round-off | ± adjustment |
| Grand Total | Payable amount |
| Amount in Words | Auto-generated |

#### Bank Details
| Field |
|-------|
| Bank Name, Account No, IFSC, Branch |

**Print Preview:** Generates print-ready layout with company logo and QR code.

---

### 7.2 Packing (`/dashboard/billing/packing`)

**Purpose:** Packing list generation linked to invoices.

**Form Fields:**

| Field | Type | Validation |
|-------|------|-----------|
| Packing List No | auto-generated | — |
| Invoice Reference | dropdown | Required |
| Carton Details | number of cartons, pairs per carton | Required |
| Logistics Partner | text | |
| Transport Mode | select | |
| Vehicle No | text | |

**Article Table:** Auto-populated from invoice with size-wise carton allocation.

---

### 7.3 Delivery (`/dashboard/billing/delivery`)

**Purpose:** Delivery record auto-generated from packing lists.

**View Modal:**
- Delivery No, Invoice Ref, Client, Store
- Carton breakdown table
- Status tracking

---

## 8. Reports Module (`/dashboard/reports`)

### Report Categories

| Tab | Description |
|-----|-------------|
| Sales | Register & Summary — Day/Month/Quarter/Year |
| Inventory | Stock position, Receipt/Dispatch |
| Production | Order status, Completion tracking |
| Intent | Pre-season order intent |
| Consignment | Consignment stock tracking |
| GST | Tax compliance register |
| Valuation | Stock valuation reports |
| Invoice | Invoice register |
| Packing | Packing list summary |

### Common Controls

| Control | Description |
|---------|-------------|
| Date Range | Custom period picker with shortcuts (Today/Week/Month/Quarter/Year) |
| View Type | Register (row-level) / Summary (aggregated) |
| Export CSV | Download full report as spreadsheet |

---

## 9. Administration Module

### 9.1 Users (`/dashboard/admin/users`)

**Purpose:** Manage user accounts and role assignments.

**Add / Edit Modal:**

| Field | Type | Validation |
|-------|------|-----------|
| Full Name | text | Required |
| Email | email | Required, valid format |
| Role | dropdown (Admin / Accountuser / Storemanager / Viewer / SuperAdmin) | Required |
| Temporary Password | password | Required on Add, hidden on Edit |
| Active | toggle | Default: ON |

---

### 9.2 Roles & Permissions (`/dashboard/admin/roles`)

**Purpose:** Configure module-level permissions per role.

**Permission Matrix:**

| Column | Description |
|--------|-------------|
| Module | 64 application modules |
| View | Can see the page |
| Add | Can create records |
| Edit | Can modify records |
| Delete | Can remove records |
| All | Toggle all four permissions |

**Roles:** Admin · Accountuser · Storemanager · Viewer

**Save:** Persists permission matrix to database per role.

---

### 9.3 Audit Log (`/dashboard/admin/audit`)

**Purpose:** Read-only tamper-evident activity trail.

**Columns:** Timestamp · User · Action · Module · Record ID · Details

**Filters:** Date range · User · Module · Action type

**Export:** Download audit log as CSV.

---

### 9.4 Company Master (`/dashboard/admin/company`)

**Purpose:** Central tenant configuration.

**Sections (tabbed navigation):**

| Section | Key Fields |
|---------|-----------|
| Branding | Company Name, Subtitle, Trade Name, Logo (upload) |
| Business | GSTIN, PAN, CIN, Full Address, Phone, Email, Website |
| Bank Details | A/C Holder, Bank Name, Branch, Account No, IFSC |
| Tax & GST | Registration Type, GST Rates (footwear ≤₹1000 / >₹1000 / other goods), HSN Prefix |
| Invoice | Invoice Prefix, Format template, FY Start Month, T&C, Declaration, Signatory Name |

**Validation:**
- GSTIN: 15-char format `22AAAAA0000A1Z5`
- PAN: 10-char format `AAAAA0000A`
- Pincode: 6-digit
- Phone: 10-digit mobile
- Email: valid format
- IFSC: `XXXX0XXXXXX` format

**Save:** Multipart form-data with logo upload support.

---

### 9.5 License Management (`/dashboard/admin/license`)

> **Access:** Super Admin only

**Current License Card:**
- License Key (masked by default, reveal button)
- Plan, Valid Period, User Count, Enabled Modules
- Days Remaining progress bar (green/yellow/orange/red)

**Generate & Activate Modal:**

| Field | Type | Options |
|-------|------|---------|
| Plan | button group | Starter / Professional / Enterprise |
| Duration | button group | 1 Month / 3 Months / 6 Months / 1 Year |
| Max Users | button group | 5 / 10 / 25 / 50 / Unlimited |
| Modules | checkbox grid | 8 available modules |

**Workflow:**
1. Click **Generate Key** → creates cryptographic key (e.g. `ABCDE-FGHIJ-KLMNO-PQRST-UVWXY`)
2. Click **Activate License** → saves to database, refreshes the license banner on all pages

**License Banner** (visible on every page):
- 🟢 Green: > 90 days remaining
- 🟡 Yellow: 30–90 days
- 🟠 Orange: < 14 days — "Manage License" link
- 🔴 Red: Expired — "Renew License" link

---

## 10. Warehouse Module (`/dashboard/warehouse`)

**Purpose:** Manage physical warehouse locations.

**Add / Edit Modal:**

| Field | Type | Validation |
|-------|------|-----------|
| Warehouse Code | text | Required, 2–10 chars, uppercase |
| Warehouse Name | text | Required, min 3 chars |
| Address | textarea | |
| City | text | Required |
| State | dropdown (37 states/UTs) | Required |
| Pincode | text | 6-digit |
| Active | toggle | Default: ON |

---

## 11. Production Module (`/dashboard/production`)

**Purpose:** Production order management and scheduling.

**Production Order Form:**

| Field | Type | Validation |
|-------|------|-----------|
| Production Order No | auto-generated | — |
| Article | searchable dropdown | Required |
| Group Name | text | Required |
| Last Type | text | |
| Dies | text | |
| Upper Leather | text | |
| Lining Leather | text | |
| Sole Material | text | |

**Size Allocation Table (EU 39–46):**

| Column | Description |
|--------|-------------|
| Size | EU size |
| Qty | Editable quantity |
| Total | Auto-sum |

**Approval Fields:**

| Field | Description |
|-------|-------------|
| Prepared By | User name |
| Checked By | User name |
| Approved By | User name |
| Date | |

**Status Workflow:**
```
DRAFT → IN_PRODUCTION → COMPLETED
      → CANCELLED
```

---

## Validation Summary — All Forms

| Pattern | Format | Example |
|---------|--------|---------|
| GSTIN | `99AAAAA9999A9Z9` | `27AABCE1234F1Z5` |
| PAN | `AAAAA9999A` | `AABCE1234F` |
| Pincode | 6-digit, non-zero start | `421302` |
| Phone | 10-digit, starts 6–9 | `9876543210` |
| Email | standard email | `info@company.com` |
| IFSC | `XXXX0XXXXXX` | `HDFC0001295` |
| Barcode | `CODE-SIZE` | `B26FW001-39` |
| HSN | 4–8 digits | `6403` |

---

## Common UI Patterns

### Data Table
All list pages use the shared `DataTable` component:
- Search bar (real-time filter)
- Filter button (advanced filters)
- Add button (opens modal)
- Export button (CSV download)
- Pagination (rows per page: 10/25/50/100)
- Edit/Delete actions per row

### Modal Forms
- Sizes: `sm` / `md` (default) / `lg` / `xl`
- Sticky header with title + close button
- Scrollable body
- Footer actions: Cancel + Save

### Status Badges
| Status | Color |
|--------|-------|
| Active / CONFIRMED | Green |
| DRAFT / PENDING | Gray |
| PROCESSING / IN_PRODUCTION | Blue |
| DISPATCHED | Indigo |
| DELIVERED / COMPLETED | Emerald |
| CANCELLED / REJECTED | Red |
| APPROVED | Teal |

### Form Validation
- Errors shown inline below each field in red (`text-destructive`)
- Validation triggered on form submit
- Field errors cleared on input change
- Required fields marked with `*`
