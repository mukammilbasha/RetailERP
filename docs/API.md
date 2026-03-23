# RetailERP - API Reference

All APIs are accessed through the YARP API Gateway at `http://localhost:5000`. Every endpoint (except login and refresh) requires a JWT bearer token in the `Authorization` header.

**Base URL**: `http://localhost:5000`

**Common Response Format**:
```json
{
  "success": true,
  "message": "Optional message",
  "data": { },
  "errors": []
}
```

**Paginated Response Format**:
```json
{
  "success": true,
  "data": {
    "items": [],
    "totalCount": 100,
    "pageNumber": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

---

## 1. Auth Service (Port 5001)

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/login` | User login, returns JWT + refresh token | None |
| `POST` | `/api/auth/refresh` | Refresh an expired access token | None |
| `POST` | `/api/auth/revoke` | Revoke a refresh token (logout) | Bearer |
| `POST` | `/api/auth/change-password` | Change current user's password | Bearer |

#### POST /api/auth/login

**Request Body:**
```json
{
  "email": "admin@elcurio.com",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "abc123...",
    "user": {
      "userId": "guid",
      "tenantId": "guid",
      "fullName": "Admin User",
      "email": "admin@elcurio.com",
      "role": "Admin",
      "tenantName": "EL CURIO"
    }
  }
}
```

#### POST /api/auth/refresh

**Request Body:**
```json
{
  "refreshToken": "abc123..."
}
```

#### POST /api/auth/change-password

**Request Body:**
```json
{
  "currentPassword": "Admin@123",
  "newPassword": "NewPass@456"
}
```

### Users (Admin Only)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/users` | List all users in tenant | Admin |
| `GET` | `/api/users/{id}` | Get user by ID | Admin |
| `POST` | `/api/users` | Create a new user | Admin |
| `PUT` | `/api/users/{id}` | Update user details | Admin |
| `DELETE` | `/api/users/{id}` | Soft-delete a user | Admin |

### Roles & Permissions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/roles` | List all roles in tenant | Bearer |
| `GET` | `/api/roles/{id}/permissions` | Get permissions for a role | Bearer |
| `PUT` | `/api/roles/{id}/permissions` | Update role permissions | Admin |

#### PUT /api/roles/{id}/permissions

**Request Body:**
```json
[
  {
    "permissionId": "guid",
    "canView": true,
    "canAdd": true,
    "canEdit": true,
    "canDelete": false
  }
]
```

---

## 2. Product Service (Port 5002)

### Articles

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/articles` | List articles (paginated, filterable) | Bearer |
| `GET` | `/api/articles/{id}` | Get article by ID | Bearer |
| `POST` | `/api/articles` | Create a new article | Bearer |
| `PUT` | `/api/articles/{id}` | Update an article | Bearer |
| `DELETE` | `/api/articles/{id}` | Delete an article | Bearer |

**Query Parameters for GET /api/articles:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pageNumber` | int | Page number (default: 1) |
| `pageSize` | int | Items per page (default: 20) |
| `search` | string | Search by article code or name |
| `brandId` | GUID | Filter by brand |
| `segmentId` | GUID | Filter by segment |
| `categoryId` | GUID | Filter by category |
| `genderId` | GUID | Filter by gender |
| `seasonId` | GUID | Filter by season |
| `isActive` | bool | Filter by active status |

### Master Data - Brands

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/brands` | List all brands | Bearer |
| `GET` | `/api/brands/{id}` | Get brand by ID | Bearer |
| `POST` | `/api/brands` | Create a brand | Bearer |
| `PUT` | `/api/brands/{id}` | Update a brand | Bearer |
| `DELETE` | `/api/brands/{id}` | Delete a brand | Bearer |

### Master Data - Genders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/genders` | List all genders | Bearer |
| `GET` | `/api/genders/{id}` | Get gender by ID | Bearer |
| `POST` | `/api/genders` | Create a gender | Bearer |
| `PUT` | `/api/genders/{id}` | Update a gender | Bearer |
| `DELETE` | `/api/genders/{id}` | Delete a gender | Bearer |

### Master Data - Seasons

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/seasons` | List all seasons | Bearer |
| `GET` | `/api/seasons/{id}` | Get season by ID | Bearer |
| `POST` | `/api/seasons` | Create a season | Bearer |
| `PUT` | `/api/seasons/{id}` | Update a season | Bearer |
| `DELETE` | `/api/seasons/{id}` | Delete a season | Bearer |

### Master Data - Segments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/segments` | List all segments | Bearer |
| `GET` | `/api/segments/{id}` | Get segment by ID | Bearer |
| `POST` | `/api/segments` | Create a segment | Bearer |
| `PUT` | `/api/segments/{id}` | Update a segment | Bearer |
| `DELETE` | `/api/segments/{id}` | Delete a segment | Bearer |

### Master Data - Sub-Segments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/subsegments?segmentId={id}` | List sub-segments, optionally filtered by parent | Bearer |
| `GET` | `/api/subsegments/{id}` | Get sub-segment by ID | Bearer |
| `POST` | `/api/subsegments` | Create a sub-segment | Bearer |
| `PUT` | `/api/subsegments/{id}` | Update a sub-segment | Bearer |
| `DELETE` | `/api/subsegments/{id}` | Delete a sub-segment | Bearer |

### Master Data - Categories

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/categories` | List all categories | Bearer |
| `GET` | `/api/categories/{id}` | Get category by ID | Bearer |
| `POST` | `/api/categories` | Create a category | Bearer |
| `PUT` | `/api/categories/{id}` | Update a category | Bearer |
| `DELETE` | `/api/categories/{id}` | Delete a category | Bearer |

### Master Data - Sub-Categories

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/subcategories?categoryId={id}` | List sub-categories, optionally filtered | Bearer |
| `GET` | `/api/subcategories/{id}` | Get sub-category by ID | Bearer |
| `POST` | `/api/subcategories` | Create a sub-category | Bearer |
| `PUT` | `/api/subcategories/{id}` | Update a sub-category | Bearer |
| `DELETE` | `/api/subcategories/{id}` | Delete a sub-category | Bearer |

### Master Data - Groups

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/groups` | List all groups (design families) | Bearer |
| `GET` | `/api/groups/{id}` | Get group by ID | Bearer |
| `POST` | `/api/groups` | Create a group | Bearer |
| `PUT` | `/api/groups/{id}` | Update a group | Bearer |
| `DELETE` | `/api/groups/{id}` | Delete a group | Bearer |

### Size Charts (Article Sizes)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/sizecharts/{articleId}` | Get sizes for an article | Bearer |
| `POST` | `/api/sizecharts/{articleId}` | Add a size to an article | Bearer |
| `PUT` | `/api/sizecharts/{articleId}/{sizeId}` | Update a size entry | Bearer |
| `DELETE` | `/api/sizecharts/{articleId}/{sizeId}` | Remove a size entry | Bearer |

---

## 3. Inventory Service (Port 5003)

### Stock

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/stock/overview` | Get stock overview (filterable by warehouse) | Bearer |
| `GET` | `/api/stock/warehouse/{warehouseId}` | Get stock for a specific warehouse | Bearer |
| `GET` | `/api/stock/availability` | Check article/size availability | Bearer |
| `POST` | `/api/stock/movement` | Record a stock movement | Bearer |
| `GET` | `/api/stock/movements` | List stock movements (filterable) | Bearer |

**Query Parameters for GET /api/stock/overview:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `warehouseId` | GUID | Filter by warehouse |
| `search` | string | Search by article code/name |

**Query Parameters for GET /api/stock/availability:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `articleId` | GUID | Article to check (required) |
| `size` | string | Specific size to check |
| `warehouseId` | GUID | Filter by warehouse |

**Query Parameters for GET /api/stock/movements:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `articleId` | GUID | Filter by article |
| `warehouseId` | GUID | Filter by warehouse |
| `from` | DateTime | Start date |
| `to` | DateTime | End date |

#### POST /api/stock/movement

**Request Body:**
```json
{
  "warehouseId": "guid",
  "articleId": "guid",
  "sku": "ART-001-40",
  "size": "40",
  "color": "Black",
  "movementType": "PURCHASE",
  "quantity": 100,
  "referenceType": "ProductionOrder",
  "referenceNumber": "PO-001",
  "notes": "Received from factory"
}
```

### Warehouses

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/warehouses` | List all warehouses | Bearer |
| `GET` | `/api/warehouses/{id}` | Get warehouse by ID | Bearer |
| `POST` | `/api/warehouses` | Create a warehouse | Admin |
| `PUT` | `/api/warehouses/{id}` | Update a warehouse | Admin |
| `DELETE` | `/api/warehouses/{id}` | Soft-delete a warehouse | Admin |

---

## 4. Order Service (Port 5004)

### Customer Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/orders` | List orders (paginated) | Bearer |
| `GET` | `/api/orders/{id}` | Get order details with line items | Bearer |
| `POST` | `/api/orders` | Create a new order (size-wise lines) | Bearer |
| `PUT` | `/api/orders/{id}` | Update an order | Bearer |
| `POST` | `/api/orders/{id}/confirm` | Confirm an order | Bearer |
| `POST` | `/api/orders/{id}/cancel` | Cancel an order | Bearer |

#### POST /api/orders/{id}/cancel

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

### Clients

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/clients` | List all clients | Bearer |
| `GET` | `/api/clients/{id}` | Get client by ID | Bearer |
| `POST` | `/api/clients` | Create a client | Bearer |
| `PUT` | `/api/clients/{id}` | Update a client | Bearer |
| `DELETE` | `/api/clients/{id}` | Delete a client | Bearer |
| `GET` | `/api/clients/{clientId}/stores` | List stores for a client | Bearer |

### Stores

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/stores` | Create a store (with clientId in body) | Bearer |
| `GET` | `/api/stores/{id}` | Get store by ID | Bearer |
| `PUT` | `/api/stores/{id}` | Update a store | Bearer |
| `DELETE` | `/api/stores/{id}` | Delete a store | Bearer |

---

## 5. Production Service (Port 5005)

### Production Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/productionorders` | List production orders (paginated) | Bearer |
| `GET` | `/api/productionorders/{id}` | Get production order details | Bearer |
| `POST` | `/api/productionorders` | Create a production order | Bearer |
| `POST` | `/api/productionorders/{id}/approve` | Approve a production order | Admin, Manager |
| `POST` | `/api/productionorders/{id}/start` | Start production | Bearer |
| `POST` | `/api/productionorders/{id}/complete` | Mark production as complete | Bearer |
| `POST` | `/api/productionorders/{id}/cancel` | Cancel a production order | Bearer |
| `PUT` | `/api/productionorders/{id}/size-runs` | Update size-wise quantities | Bearer |

**Production Order Status Flow:**
```
DRAFT --> APPROVED --> IN_PRODUCTION --> COMPLETED
  |          |              |
  +----------+--------------+--------> CANCELLED
```

#### PUT /api/productionorders/{id}/size-runs

**Request Body:**
```json
[
  { "euroSize": 39, "quantity": 50, "producedQty": 0 },
  { "euroSize": 40, "quantity": 80, "producedQty": 0 },
  { "euroSize": 41, "quantity": 100, "producedQty": 0 },
  { "euroSize": 42, "quantity": 80, "producedQty": 0 },
  { "euroSize": 43, "quantity": 50, "producedQty": 0 }
]
```

---

## 6. Billing Service (Port 5006)

### Invoices

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/invoices` | List invoices (paginated) | Bearer |
| `GET` | `/api/invoices/{id}` | Get invoice details with line items | Bearer |
| `POST` | `/api/invoices` | Create a tax invoice | Bearer |
| `POST` | `/api/invoices/{id}/issue` | Finalize/issue an invoice | Bearer |
| `POST` | `/api/invoices/{id}/cancel` | Cancel an invoice | Bearer |
| `POST` | `/api/invoices/{id}/payment` | Record a payment against an invoice | Bearer |
| `GET` | `/api/invoices/{id}/packing-lists` | Get packing lists for an invoice | Bearer |

**Invoice Status Flow:**
```
DRAFT --> FINALIZED --> (payment recorded)
  |
  +----> CANCELLED
```

**Invoice Types:** `TAX_INVOICE`, `CREDIT_NOTE`, `DEBIT_NOTE`

#### POST /api/invoices/{id}/payment

**Request Body:**
```json
{
  "amount": 25000.00
}
```

### Packing Lists

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/packing` | Create a packing list for an invoice | Bearer |
| `GET` | `/api/packing/{id}` | Get packing list details | Bearer |

---

## 7. Reporting Service (Port 5007)

All report endpoints return data arrays. All require Bearer authentication.

| Method | Endpoint | Description | Query Parameters |
|--------|----------|-------------|-----------------|
| `GET` | `/api/reports/sales` | Sales report by date range | `fromDate`, `toDate`, `clientId?` |
| `GET` | `/api/reports/inventory` | Inventory/stock report | `warehouseId?`, `lowStockOnly?` |
| `GET` | `/api/reports/production` | Production orders report | `fromDate`, `toDate`, `status?` |
| `GET` | `/api/reports/gst` | GST tax report for compliance | `fromDate`, `toDate` |
| `GET` | `/api/reports/client-orders` | Client-wise order analysis | `fromDate`, `toDate`, `clientId?` |

### Report Tabs Available in Frontend

The frontend reports page provides 9 report types:

| Tab | Description |
|-----|-------------|
| Sales | Sales register/summary by date, client, article |
| Inventory | Stock levels across warehouses, low-stock alerts |
| Production | Production order status and completion tracking |
| Intent | Purchase intent analysis |
| Consignment | Consignment stock tracking |
| GST | GST-compliant tax reports (CGST/SGST/IGST) |
| Valuation | Stock valuation reports |
| Invoice | Invoice register with tax breakdowns |
| Packing | Packing list details by invoice |

---

## Common Patterns

### Error Responses

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Article code is required",
    "Brand ID is not valid"
  ]
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (returned from POST with `CreatedAtAction`) |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (missing or invalid JWT) |
| 403 | Forbidden (insufficient role/permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

### Authentication Header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Pagination Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pageNumber` | int | 1 | Current page |
| `pageSize` | int | 20 | Items per page |
| `search` | string | null | Search term |
| `sortBy` | string | null | Sort field |
| `sortDirection` | string | "asc" | Sort direction |
