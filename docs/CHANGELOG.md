# RetailERP - Changelog

All notable features and changes to the RetailERP platform are documented here.

---

## v1.0.0 -- Initial Release

### Platform Foundation

- **Multi-Tenant Architecture** -- Complete tenant isolation via TenantId on all business entities
- **Microservices Architecture** -- 9 independent .NET services with Clean Architecture (4 layers each)
- **YARP API Gateway** -- Centralized reverse proxy with rate limiting (100 req/min per IP) and CORS
- **Docker Compose** -- Full-stack containerization with automatic database initialization
- **Kubernetes Manifests** -- Production-ready K8s deployment with 2 replicas per service

### Authentication & Authorization

- JWT-based authentication with access and refresh tokens
- Refresh token rotation for security
- BCrypt password hashing
- Role-Based Access Control (RBAC) with 6 default roles: Admin, Manager, Warehouse, Sales, Accounts, Viewer
- Per-module permission matrix (View, Add, Edit, Delete) for 24 modules
- First-login password change enforcement
- Automatic token refresh on 401 responses (frontend interceptor)

### Master Data Management

- **Brands** -- CRUD operations with tenant-scoped uniqueness
- **Genders** -- Product gender targeting (Men, Women, Kids, Unisex)
- **Seasons** -- Seasonal collections with date ranges and validation
- **Segments** -- Product line segments (e.g., Footwear, Leather Goods)
- **Sub-Segments** -- Hierarchical sub-classifications linked to parent segments
- **Categories** -- Product categories (e.g., Shoes, Bags, Belts)
- **Sub-Categories** -- Sub-types linked to parent categories (e.g., Derby, Oxford, Loafer)
- **Groups** -- Design families / collections
- **Colors** -- Color definitions with hex codes
- **Styles** -- Style classifications
- **Fasteners** -- Fastener types (Lace-up, Velcro, Buckle)
- **Size Charts** -- Multi-standard size conversion (US, Euro, UK, Indian) with gender and age group support
- **HSN Codes** -- GST Harmonized System codes with default rates (seeded for footwear and leather goods)
- **Indian States** -- All states with GST state codes and zones (seeded)

### Product Management

- **Article Master** -- Comprehensive product management with:
  - Rich categorization (brand, segment, category, gender, season, group)
  - Size-based product flag
  - HSN code for GST
  - MRP and CBD (cost breakdown) pricing
  - Image support
  - Launch date tracking
- **Footwear Details** -- Extended attributes: Last, Upper Leather, Lining Leather, Sole, Size Run
- **Leather Goods Details** -- Extended attributes: Dimensions, Security features
- **Article Sizes** -- Size variants with Euro/UK/US sizes, EAN barcodes, and size-specific MRP
- **Article Images** -- Multiple images with display order and primary flag
- **Article Filtering** -- Filter by brand, segment, category, gender, season, active status with pagination

### Customer Management

- **Clients** -- B2B distribution client management with:
  - GSTIN and PAN tracking
  - State-based zone assignment
  - Default margin percentage and type configuration
  - Search and filtering
- **Stores** -- Retail store locations linked to clients with:
  - Store format (Mall, High Street, Outlet)
  - Sales channel (MBO, EBO, Distributor)
  - Modus operandi (SOR, Outright Market)
  - Store-level margin override
  - Manager and contact details
- **Customer Master Entries** -- Detailed billing/shipping address management per store with:
  - Multi-line billing and shipping addresses
  - Same-as-billing flag
  - Store manager, area manager, buyer contacts
  - GSTIN, PAN, FSSAI at store level
  - Business channel and module configuration

### Inventory Management

- **Stock Ledger** -- Real-time stock tracking per article/size/warehouse with:
  - Opening, inward, outward, and computed closing stock
  - Positive stock constraint (prevents negative inventory)
  - Unique constraint per tenant/warehouse/article/size
- **Stock Movements** -- Complete transaction log with:
  - 6 movement types: OPENING, PURCHASE, PRODUCTION, SALES, RETURN, ADJUSTMENT
  - Direction tracking (INWARD/OUTWARD)
  - Reference linking to source documents
  - Notes and audit trail
- **Stock Adjustments** -- Correction workflow with:
  - Draft/Approved/Cancelled status flow
  - Line-level ADD/REMOVE entries
  - Approval tracking
- **Stock Overview Page** -- Expandable article rows showing size-wise breakdown with frozen indicator
- **Stock Receipt (GRN)** -- Goods received note entry with size-wise quantities
- **Stock Dispatch** -- Outward dispatch recording
- **Stock Returns** -- Customer return processing
- **Stock Freeze** -- Period-end stock locking/unlocking
- **Transaction History** -- Filterable movement history

### Order Management

- **Customer Orders** -- Size-wise order creation with:
  - Client and store selection
  - Article search with auto-populated details
  - Size grid showing opening stock, order quantity, and computed closing stock
  - Multi-article orders
  - Total quantity and amount calculations
  - Status workflow: DRAFT > CONFIRMED > PROCESSING > DISPATCHED > DELIVERED
  - Order confirmation and cancellation (with reason)
- **Sales Channels** -- Channel configuration (MBO, EBO, Distributor)

### Production Management

- **Production Orders** -- Size-wise production tracking with:
  - Article selection with auto-filled material details
  - Order types: REPLENISHMENT, FRESH, SAMPLE
  - Material specifications: Last, Upper Leather, Lining Leather, Sole
  - Cutting die specifications
  - Status workflow: DRAFT > APPROVED > IN_PRODUCTION > COMPLETED
  - Approval by Admin/Manager roles
  - Size run management with ordered vs produced quantities
  - Print-ready production order format

### Billing & Invoicing

- **Tax Invoices** -- GST-compliant invoice generation with:
  - Automatic CGST/SGST or IGST calculation based on place of supply
  - Inter-state vs intra-state tax determination
  - Invoice types: TAX_INVOICE, CREDIT_NOTE, DEBIT_NOTE
  - Line-level tax breakdown with HSN codes
  - Margin calculation (MRP - Margin% = Unit Price)
  - Round-off and net payable calculation
  - IRN (e-Invoice Reference Number) support
  - E-Way Bill number support
  - Print-ready invoice format
  - Status flow: DRAFT > FINALIZED or CANCELLED
  - Payment recording
- **Packing Lists** -- Carton-wise packing with:
  - Linked to invoice
  - Transport details (mode, vehicle, logistics partner)
  - LR (Lorry Receipt) number and date
  - Carton-level article/size/quantity breakdown
  - Total cartons and total pairs calculation
- **Delivery Notes** -- Delivery tracking with:
  - Receipt confirmation
  - Status: PENDING > DELIVERED or PARTIAL

### Reporting & Analytics

- **Sales Report** -- Register and summary views with date range and client filter
- **Inventory Report** -- Stock levels with low-stock alerts and warehouse filter
- **Production Report** -- Order tracking by status, date, completion rates
- **GST Report** -- Tax compliance with CGST/SGST/IGST breakdown for return filing
- **Client Order Report** -- Client-wise order analysis with total/net order values
- **Additional Report Tabs** -- Intent, Consignment, Valuation, Invoice Register, Packing Reports
- **CSV Export** -- All reports exportable to CSV
- **Date Range Shortcuts** -- Today, This Week, This Month, This Quarter, This Year, Custom
- **Dapper-based Queries** -- High-performance direct SQL for report generation

### Administration

- **User Management** -- CRUD for user accounts with role assignment
- **Roles & Permissions** -- Per-module CRUD permission management
- **Audit Log** -- Complete audit trail with old/new value tracking, IP address, user agent
- **Company Master** -- Tenant profile with GSTIN, PAN, logo, address
- **License Management** -- License status and module tracking

### Frontend

- **Next.js 15** with App Router and React 19
- **38 Dashboard Pages** covering all modules
- **Responsive Design** -- Works on desktop, tablet, and mobile
- **Dark/Light Mode** with system preference detection
- **5 Color Themes** -- Blue, Indigo, Emerald, Purple, Orange
- **Collapsible Sidebar** -- 260px expanded, 72px collapsed with tooltips
- **Loading Skeletons** -- Smooth loading states on all pages
- **SVG Charts** -- Custom area chart, donut chart, bar chart (no chart library dependency)
- **Interactive Dashboard** -- 6 KPI cards, 4 charts, quick actions, recent orders
- **DataTable Component** -- Reusable table with pagination, sorting, search
- **Modal Component** -- Dialog for create/edit operations
- **StatusBadge Component** -- Color-coded status indicators
- **PWA Support** -- Service worker registration for offline capability
- **3D Animated Login** -- CSS 3D scene with rotating platform and floating cubes

### Infrastructure

- **Docker Compose** -- 15 services including SQL Server, Redis, Prometheus, Grafana
- **Automatic DB Init** -- One-shot container runs all SQL scripts in order
- **Kubernetes Manifests** -- Namespace, secrets, configmap, deployments, services, ingress
- **Prometheus Metrics** -- `/metrics` endpoint on all services using prometheus-net
- **Grafana Dashboards** -- Pre-configured monitoring
- **Serilog Logging** -- Structured logging to console with configurable sinks
- **Health Checks** -- `/health` endpoint on every service
- **Rate Limiting** -- Fixed window rate limiter (100 req/min per IP)
- **CORS Configuration** -- Configurable allowed origins

### Database

- **43 Tables** across 9 schemas
- **4 Stored Procedures** -- Articles, billing, brands, inventory
- **Performance Indexes** -- Optimized for common query patterns
- **Seed Data** -- 24 permission modules, 31 Indian states, 6 HSN codes
- **Computed Columns** -- ClosingStock in StockLedger
- **Check Constraints** -- Date validation, positive quantity, enum validation
