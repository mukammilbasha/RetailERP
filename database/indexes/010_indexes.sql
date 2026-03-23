-- ============================================================
-- RetailERP - Indexes for Performance
-- ============================================================
USE RetailERP;
GO

-- Auth indexes
CREATE NONCLUSTERED INDEX IX_Users_TenantId ON auth.Users(TenantId) INCLUDE (Email, FullName, RoleId, IsActive);
CREATE NONCLUSTERED INDEX IX_Users_Email ON auth.Users(Email) INCLUDE (TenantId, PasswordHash, IsActive);
CREATE NONCLUSTERED INDEX IX_RefreshTokens_UserId ON auth.RefreshTokens(UserId) INCLUDE (Token, ExpiresAt, RevokedAt);
CREATE NONCLUSTERED INDEX IX_RefreshTokens_Token ON auth.RefreshTokens(Token);
CREATE NONCLUSTERED INDEX IX_AuditLog_TenantId_Timestamp ON audit.AuditLog(TenantId, Timestamp DESC);
CREATE NONCLUSTERED INDEX IX_AuditLog_EntityType ON audit.AuditLog(EntityType, EntityId);

-- Master indexes
CREATE NONCLUSTERED INDEX IX_Brands_TenantId ON master.Brands(TenantId) WHERE IsActive = 1;
CREATE NONCLUSTERED INDEX IX_Segments_TenantId ON master.Segments(TenantId) WHERE IsActive = 1;
CREATE NONCLUSTERED INDEX IX_SubSegments_SegmentId ON master.SubSegments(SegmentId) WHERE IsActive = 1;
CREATE NONCLUSTERED INDEX IX_Categories_TenantId ON master.Categories(TenantId) WHERE IsActive = 1;
CREATE NONCLUSTERED INDEX IX_SubCategories_CategoryId ON master.SubCategories(CategoryId) WHERE IsActive = 1;
CREATE NONCLUSTERED INDEX IX_SizeCharts_TenantGender ON master.SizeCharts(TenantId, GenderId, ChartType);

-- Product indexes
CREATE NONCLUSTERED INDEX IX_Articles_TenantId ON product.Articles(TenantId) INCLUDE (ArticleCode, ArticleName, BrandId, CategoryId, IsActive);
CREATE NONCLUSTERED INDEX IX_Articles_BrandId ON product.Articles(BrandId);
CREATE NONCLUSTERED INDEX IX_Articles_CategoryId ON product.Articles(CategoryId);
CREATE NONCLUSTERED INDEX IX_Articles_SegmentId ON product.Articles(SegmentId);
CREATE NONCLUSTERED INDEX IX_Articles_SeasonId ON product.Articles(SeasonId);
CREATE NONCLUSTERED INDEX IX_ArticleSizes_ArticleId ON product.ArticleSizes(ArticleId) INCLUDE (EuroSize, EANCode, MRP);

-- Inventory indexes
CREATE NONCLUSTERED INDEX IX_StockLedger_WarehouseArticle ON inventory.StockLedger(WarehouseId, ArticleId) INCLUDE (EuroSize, ClosingStock);
CREATE NONCLUSTERED INDEX IX_StockLedger_TenantArticle ON inventory.StockLedger(TenantId, ArticleId);
CREATE NONCLUSTERED INDEX IX_StockMovements_TenantId ON inventory.StockMovements(TenantId, MovementDate DESC);
CREATE NONCLUSTERED INDEX IX_StockMovements_ArticleId ON inventory.StockMovements(ArticleId, WarehouseId);
CREATE NONCLUSTERED INDEX IX_StockMovements_Reference ON inventory.StockMovements(ReferenceType, ReferenceId);

-- Sales indexes
CREATE NONCLUSTERED INDEX IX_Clients_TenantId ON sales.Clients(TenantId) WHERE IsActive = 1;
CREATE NONCLUSTERED INDEX IX_Stores_ClientId ON sales.Stores(ClientId) WHERE IsActive = 1;
CREATE NONCLUSTERED INDEX IX_Stores_TenantId ON sales.Stores(TenantId);
CREATE NONCLUSTERED INDEX IX_CustomerOrders_TenantId ON sales.CustomerOrders(TenantId, OrderDate DESC);
CREATE NONCLUSTERED INDEX IX_CustomerOrders_ClientId ON sales.CustomerOrders(ClientId);
CREATE NONCLUSTERED INDEX IX_CustomerOrders_Status ON sales.CustomerOrders(Status) INCLUDE (TenantId, OrderDate);
CREATE NONCLUSTERED INDEX IX_OrderLines_OrderId ON sales.OrderLines(OrderId);
CREATE NONCLUSTERED INDEX IX_OrderLines_ArticleId ON sales.OrderLines(ArticleId);

-- Production indexes
CREATE NONCLUSTERED INDEX IX_ProdOrders_TenantId ON production.ProductionOrders(TenantId, OrderDate DESC);
CREATE NONCLUSTERED INDEX IX_ProdOrders_ArticleId ON production.ProductionOrders(ArticleId);
CREATE NONCLUSTERED INDEX IX_ProdOrders_Status ON production.ProductionOrders(Status) INCLUDE (TenantId, OrderDate);
CREATE NONCLUSTERED INDEX IX_ProdSizeRuns_OrderId ON production.ProductionSizeRuns(ProductionOrderId);

-- Billing indexes
CREATE NONCLUSTERED INDEX IX_Invoices_TenantId ON billing.Invoices(TenantId, InvoiceDate DESC);
CREATE NONCLUSTERED INDEX IX_Invoices_ClientId ON billing.Invoices(ClientId);
CREATE NONCLUSTERED INDEX IX_Invoices_OrderId ON billing.Invoices(OrderId);
CREATE NONCLUSTERED INDEX IX_Invoices_Status ON billing.Invoices(Status) INCLUDE (TenantId, InvoiceDate);
CREATE NONCLUSTERED INDEX IX_InvoiceLines_InvoiceId ON billing.InvoiceLines(InvoiceId);
CREATE NONCLUSTERED INDEX IX_PackingLists_InvoiceId ON billing.PackingLists(InvoiceId);
GO

PRINT 'Indexes created successfully.';
GO
