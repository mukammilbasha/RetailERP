-- ============================================================
-- RetailERP - FILE 2 OF 3: Indexes + Stored Procedures
-- Idempotent: all indexes guarded with IF NOT EXISTS
-- All stored procedures use CREATE OR ALTER
-- Run AFTER File 1
-- ============================================================
USE RetailERP;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- SECTION 1: FILTERED UNIQUE INDEXES (soft-delete safe)
-- Replaces plain UNIQUE constraints for master/sales/warehouse
-- ============================================================

-- master.Brands
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_Brands_Name_Tenant' AND object_id=OBJECT_ID('master.Brands'))
    CREATE UNIQUE INDEX UQ_Brands_Name_Tenant ON master.Brands(TenantId, BrandName) WHERE IsActive = 1;
GO

-- master.Genders
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_Genders_Name_Tenant' AND object_id=OBJECT_ID('master.Genders'))
    CREATE UNIQUE INDEX UQ_Genders_Name_Tenant ON master.Genders(TenantId, GenderName) WHERE IsActive = 1;
GO

-- master.Seasons
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_Seasons_Code_Tenant' AND object_id=OBJECT_ID('master.Seasons'))
    CREATE UNIQUE INDEX UQ_Seasons_Code_Tenant ON master.Seasons(TenantId, SeasonCode) WHERE IsActive = 1;
GO

-- master.Segments
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_Segments_Name_Tenant' AND object_id=OBJECT_ID('master.Segments'))
    CREATE UNIQUE INDEX UQ_Segments_Name_Tenant ON master.Segments(TenantId, SegmentName) WHERE IsActive = 1;
GO

-- master.SubSegments
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_SubSegments_Name_Segment' AND object_id=OBJECT_ID('master.SubSegments'))
    CREATE UNIQUE INDEX UQ_SubSegments_Name_Segment ON master.SubSegments(SegmentId, SubSegmentName) WHERE IsActive = 1;
GO

-- master.Categories
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_Categories_Name_Tenant' AND object_id=OBJECT_ID('master.Categories'))
    CREATE UNIQUE INDEX UQ_Categories_Name_Tenant ON master.Categories(TenantId, CategoryName) WHERE IsActive = 1;
GO

-- master.SubCategories
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_SubCategories_Name_Cat' AND object_id=OBJECT_ID('master.SubCategories'))
    CREATE UNIQUE INDEX UQ_SubCategories_Name_Cat ON master.SubCategories(CategoryId, SubCategoryName) WHERE IsActive = 1;
GO

-- master.Groups
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_Groups_Name_Tenant' AND object_id=OBJECT_ID('master.Groups'))
    CREATE UNIQUE INDEX UQ_Groups_Name_Tenant ON master.Groups(TenantId, GroupName) WHERE IsActive = 1;
GO

-- sales.Clients
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_Clients_Code_Tenant' AND object_id=OBJECT_ID('sales.Clients'))
    CREATE UNIQUE INDEX UQ_Clients_Code_Tenant ON sales.Clients(TenantId, ClientCode) WHERE IsActive = 1;
GO

-- sales.Stores
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_Stores_Code_Tenant' AND object_id=OBJECT_ID('sales.Stores'))
    CREATE UNIQUE INDEX UQ_Stores_Code_Tenant ON sales.Stores(TenantId, StoreCode) WHERE IsActive = 1;
GO

-- warehouse.Warehouses
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_Warehouses_Code_Tenant' AND object_id=OBJECT_ID('warehouse.Warehouses'))
    CREATE UNIQUE INDEX UQ_Warehouses_Code_Tenant ON warehouse.Warehouses(TenantId, WarehouseCode) WHERE IsActive = 1;
GO

PRINT 'Filtered unique indexes ready.';
GO

-- ============================================================
-- SECTION 2: PERFORMANCE INDEXES
-- ============================================================

-- Auth
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Users_TenantId' AND object_id=OBJECT_ID('auth.Users'))
    CREATE NONCLUSTERED INDEX IX_Users_TenantId ON auth.Users(TenantId) INCLUDE (Email, FullName, RoleId, IsActive);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Users_Email' AND object_id=OBJECT_ID('auth.Users'))
    CREATE NONCLUSTERED INDEX IX_Users_Email ON auth.Users(Email) INCLUDE (TenantId, PasswordHash, IsActive);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_RefreshTokens_UserId' AND object_id=OBJECT_ID('auth.RefreshTokens'))
    CREATE NONCLUSTERED INDEX IX_RefreshTokens_UserId ON auth.RefreshTokens(UserId) INCLUDE (Token, ExpiresAt, RevokedAt);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_RefreshTokens_Token' AND object_id=OBJECT_ID('auth.RefreshTokens'))
    CREATE NONCLUSTERED INDEX IX_RefreshTokens_Token ON auth.RefreshTokens(Token);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_AuditLog_TenantId_Timestamp' AND object_id=OBJECT_ID('audit.AuditLog'))
    CREATE NONCLUSTERED INDEX IX_AuditLog_TenantId_Timestamp ON audit.AuditLog(TenantId, Timestamp DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_AuditLog_EntityType' AND object_id=OBJECT_ID('audit.AuditLog'))
    CREATE NONCLUSTERED INDEX IX_AuditLog_EntityType ON audit.AuditLog(EntityType, EntityId);
GO

-- Master
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Brands_TenantId' AND object_id=OBJECT_ID('master.Brands'))
    CREATE NONCLUSTERED INDEX IX_Brands_TenantId ON master.Brands(TenantId) WHERE IsActive = 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Segments_TenantId' AND object_id=OBJECT_ID('master.Segments'))
    CREATE NONCLUSTERED INDEX IX_Segments_TenantId ON master.Segments(TenantId) WHERE IsActive = 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_SubSegments_SegmentId' AND object_id=OBJECT_ID('master.SubSegments'))
    CREATE NONCLUSTERED INDEX IX_SubSegments_SegmentId ON master.SubSegments(SegmentId) WHERE IsActive = 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Categories_TenantId' AND object_id=OBJECT_ID('master.Categories'))
    CREATE NONCLUSTERED INDEX IX_Categories_TenantId ON master.Categories(TenantId) WHERE IsActive = 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_SubCategories_CategoryId' AND object_id=OBJECT_ID('master.SubCategories'))
    CREATE NONCLUSTERED INDEX IX_SubCategories_CategoryId ON master.SubCategories(CategoryId) WHERE IsActive = 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_SizeCharts_TenantGender' AND object_id=OBJECT_ID('master.SizeCharts'))
    CREATE NONCLUSTERED INDEX IX_SizeCharts_TenantGender ON master.SizeCharts(TenantId, GenderId, ChartType);
GO

-- Product
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Articles_TenantId' AND object_id=OBJECT_ID('product.Articles'))
    CREATE NONCLUSTERED INDEX IX_Articles_TenantId ON product.Articles(TenantId) INCLUDE (ArticleCode, ArticleName, BrandId, CategoryId, IsActive);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Articles_BrandId' AND object_id=OBJECT_ID('product.Articles'))
    CREATE NONCLUSTERED INDEX IX_Articles_BrandId ON product.Articles(BrandId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Articles_CategoryId' AND object_id=OBJECT_ID('product.Articles'))
    CREATE NONCLUSTERED INDEX IX_Articles_CategoryId ON product.Articles(CategoryId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Articles_SegmentId' AND object_id=OBJECT_ID('product.Articles'))
    CREATE NONCLUSTERED INDEX IX_Articles_SegmentId ON product.Articles(SegmentId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Articles_SeasonId' AND object_id=OBJECT_ID('product.Articles'))
    CREATE NONCLUSTERED INDEX IX_Articles_SeasonId ON product.Articles(SeasonId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ArticleSizes_ArticleId' AND object_id=OBJECT_ID('product.ArticleSizes'))
    CREATE NONCLUSTERED INDEX IX_ArticleSizes_ArticleId ON product.ArticleSizes(ArticleId) INCLUDE (EuroSize, EANCode, MRP);
GO

-- Inventory
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_StockLedger_WarehouseArticle' AND object_id=OBJECT_ID('inventory.StockLedger'))
    CREATE NONCLUSTERED INDEX IX_StockLedger_WarehouseArticle ON inventory.StockLedger(WarehouseId, ArticleId) INCLUDE (EuroSize, ClosingStock);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_StockLedger_TenantArticle' AND object_id=OBJECT_ID('inventory.StockLedger'))
    CREATE NONCLUSTERED INDEX IX_StockLedger_TenantArticle ON inventory.StockLedger(TenantId, ArticleId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_StockMovements_TenantId' AND object_id=OBJECT_ID('inventory.StockMovements'))
    CREATE NONCLUSTERED INDEX IX_StockMovements_TenantId ON inventory.StockMovements(TenantId, MovementDate DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_StockMovements_ArticleId' AND object_id=OBJECT_ID('inventory.StockMovements'))
    CREATE NONCLUSTERED INDEX IX_StockMovements_ArticleId ON inventory.StockMovements(ArticleId, WarehouseId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_StockMovements_Reference' AND object_id=OBJECT_ID('inventory.StockMovements'))
    CREATE NONCLUSTERED INDEX IX_StockMovements_Reference ON inventory.StockMovements(ReferenceType, ReferenceId);
GO

-- Sales
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Clients_TenantId' AND object_id=OBJECT_ID('sales.Clients'))
    CREATE NONCLUSTERED INDEX IX_Clients_TenantId ON sales.Clients(TenantId) WHERE IsActive = 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Stores_ClientId' AND object_id=OBJECT_ID('sales.Stores'))
    CREATE NONCLUSTERED INDEX IX_Stores_ClientId ON sales.Stores(ClientId) WHERE IsActive = 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Stores_TenantId' AND object_id=OBJECT_ID('sales.Stores'))
    CREATE NONCLUSTERED INDEX IX_Stores_TenantId ON sales.Stores(TenantId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_CustomerOrders_TenantId' AND object_id=OBJECT_ID('sales.CustomerOrders'))
    CREATE NONCLUSTERED INDEX IX_CustomerOrders_TenantId ON sales.CustomerOrders(TenantId, OrderDate DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_CustomerOrders_ClientId' AND object_id=OBJECT_ID('sales.CustomerOrders'))
    CREATE NONCLUSTERED INDEX IX_CustomerOrders_ClientId ON sales.CustomerOrders(ClientId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_CustomerOrders_Status' AND object_id=OBJECT_ID('sales.CustomerOrders'))
    CREATE NONCLUSTERED INDEX IX_CustomerOrders_Status ON sales.CustomerOrders(Status) INCLUDE (TenantId, OrderDate);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_OrderLines_OrderId' AND object_id=OBJECT_ID('sales.OrderLines'))
    CREATE NONCLUSTERED INDEX IX_OrderLines_OrderId ON sales.OrderLines(OrderId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_OrderLines_ArticleId' AND object_id=OBJECT_ID('sales.OrderLines'))
    CREATE NONCLUSTERED INDEX IX_OrderLines_ArticleId ON sales.OrderLines(ArticleId);
GO

-- Production
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ProdOrders_TenantId' AND object_id=OBJECT_ID('production.ProductionOrders'))
    CREATE NONCLUSTERED INDEX IX_ProdOrders_TenantId ON production.ProductionOrders(TenantId, OrderDate DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ProdOrders_ArticleId' AND object_id=OBJECT_ID('production.ProductionOrders'))
    CREATE NONCLUSTERED INDEX IX_ProdOrders_ArticleId ON production.ProductionOrders(ArticleId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ProdOrders_Status' AND object_id=OBJECT_ID('production.ProductionOrders'))
    CREATE NONCLUSTERED INDEX IX_ProdOrders_Status ON production.ProductionOrders(Status) INCLUDE (TenantId, OrderDate);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ProdSizeRuns_OrderId' AND object_id=OBJECT_ID('production.ProductionSizeRuns'))
    CREATE NONCLUSTERED INDEX IX_ProdSizeRuns_OrderId ON production.ProductionSizeRuns(ProductionOrderId);
GO

-- Billing
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Invoices_TenantId' AND object_id=OBJECT_ID('billing.Invoices'))
    CREATE NONCLUSTERED INDEX IX_Invoices_TenantId ON billing.Invoices(TenantId, InvoiceDate DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Invoices_Tenant_Date' AND object_id=OBJECT_ID('billing.Invoices'))
    CREATE NONCLUSTERED INDEX IX_Invoices_Tenant_Date ON billing.Invoices(TenantId, InvoiceDate DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Invoices_Tenant_Status' AND object_id=OBJECT_ID('billing.Invoices'))
    CREATE NONCLUSTERED INDEX IX_Invoices_Tenant_Status ON billing.Invoices(TenantId, Status);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Invoices_ClientId' AND object_id=OBJECT_ID('billing.Invoices'))
    CREATE NONCLUSTERED INDEX IX_Invoices_ClientId ON billing.Invoices(ClientId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Invoices_OrderId' AND object_id=OBJECT_ID('billing.Invoices'))
    CREATE NONCLUSTERED INDEX IX_Invoices_OrderId ON billing.Invoices(OrderId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Invoices_Status' AND object_id=OBJECT_ID('billing.Invoices'))
    CREATE NONCLUSTERED INDEX IX_Invoices_Status ON billing.Invoices(Status) INCLUDE (TenantId, InvoiceDate);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_InvoiceLines_InvoiceId' AND object_id=OBJECT_ID('billing.InvoiceLines'))
    CREATE NONCLUSTERED INDEX IX_InvoiceLines_InvoiceId ON billing.InvoiceLines(InvoiceId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_InvoiceLines_Invoice' AND object_id=OBJECT_ID('billing.InvoiceLines'))
    CREATE NONCLUSTERED INDEX IX_InvoiceLines_Invoice ON billing.InvoiceLines(InvoiceId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_PackingLists_InvoiceId' AND object_id=OBJECT_ID('billing.PackingLists'))
    CREATE NONCLUSTERED INDEX IX_PackingLists_InvoiceId ON billing.PackingLists(InvoiceId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_PackingLists_Tenant_Invoice' AND object_id=OBJECT_ID('billing.PackingLists'))
    CREATE NONCLUSTERED INDEX IX_PackingLists_Tenant_Invoice ON billing.PackingLists(TenantId, InvoiceId);
GO

PRINT 'All indexes ready.';
GO

-- ============================================================
-- SECTION 3: STORED PROCEDURES — BRANDS
-- ============================================================

CREATE OR ALTER PROCEDURE master.sp_Brand_GetAll
    @TenantId   UNIQUEIDENTIFIER,
    @SearchTerm NVARCHAR(200) = NULL,
    @IsActive   BIT = NULL,
    @PageNumber INT = 1,
    @PageSize   INT = 25
AS
BEGIN
    SET NOCOUNT ON;
    SELECT BrandId, TenantId, BrandName, IsActive, CreatedAt, UpdatedAt
    FROM master.Brands
    WHERE TenantId = @TenantId
        AND (@SearchTerm IS NULL OR BrandName LIKE '%' + @SearchTerm + '%')
        AND (@IsActive IS NULL OR IsActive = @IsActive)
    ORDER BY BrandName
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount FROM master.Brands
    WHERE TenantId = @TenantId
        AND (@SearchTerm IS NULL OR BrandName LIKE '%' + @SearchTerm + '%')
        AND (@IsActive IS NULL OR IsActive = @IsActive);
END;
GO

CREATE OR ALTER PROCEDURE master.sp_Brand_GetById
    @BrandId  UNIQUEIDENTIFIER,
    @TenantId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT BrandId, TenantId, BrandName, IsActive, CreatedAt, UpdatedAt
    FROM master.Brands WHERE BrandId = @BrandId AND TenantId = @TenantId;
END;
GO

CREATE OR ALTER PROCEDURE master.sp_Brand_Create
    @TenantId  UNIQUEIDENTIFIER,
    @BrandName NVARCHAR(200),
    @IsActive  BIT = 1,
    @CreatedBy UNIQUEIDENTIFIER = NULL,
    @BrandId   UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @BrandId = NEWID();
    INSERT INTO master.Brands (BrandId, TenantId, BrandName, IsActive, CreatedBy)
    VALUES (@BrandId, @TenantId, @BrandName, @IsActive, @CreatedBy);
END;
GO

CREATE OR ALTER PROCEDURE master.sp_Brand_Update
    @BrandId   UNIQUEIDENTIFIER,
    @TenantId  UNIQUEIDENTIFIER,
    @BrandName NVARCHAR(200),
    @IsActive  BIT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE master.Brands
    SET BrandName = @BrandName, IsActive = @IsActive, UpdatedAt = SYSUTCDATETIME()
    WHERE BrandId = @BrandId AND TenantId = @TenantId;
END;
GO

CREATE OR ALTER PROCEDURE master.sp_Brand_Delete
    @BrandId  UNIQUEIDENTIFIER,
    @TenantId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM product.Articles WHERE BrandId = @BrandId)
        UPDATE master.Brands SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
        WHERE BrandId = @BrandId AND TenantId = @TenantId;
    ELSE
        DELETE FROM master.Brands WHERE BrandId = @BrandId AND TenantId = @TenantId;
END;
GO

-- ============================================================
-- SECTION 4: STORED PROCEDURES — ARTICLES
-- ============================================================

CREATE OR ALTER PROCEDURE product.sp_Article_GetAll
    @TenantId   UNIQUEIDENTIFIER,
    @SearchTerm NVARCHAR(200) = NULL,
    @BrandId    UNIQUEIDENTIFIER = NULL,
    @CategoryId UNIQUEIDENTIFIER = NULL,
    @SegmentId  UNIQUEIDENTIFIER = NULL,
    @SeasonId   UNIQUEIDENTIFIER = NULL,
    @IsActive   BIT = NULL,
    @PageNumber INT = 1,
    @PageSize   INT = 25
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        a.ArticleId, a.ArticleCode, a.ArticleName, a.Color, a.Style,
        a.HSNCode, a.UOM, a.MRP, a.CBD, a.IsSizeBased, a.IsActive, a.ImageUrl,
        b.BrandName, s.SegmentName, c.CategoryName, sc.SubCategoryName,
        g.GroupName, se.SeasonCode, gen.GenderName,
        fd.Last, fd.UpperLeather, fd.LiningLeather, fd.Sole,
        fd.SizeRunFrom, fd.SizeRunTo
    FROM product.Articles a
    LEFT JOIN master.Brands       b  ON a.BrandId       = b.BrandId
    LEFT JOIN master.Segments     s  ON a.SegmentId     = s.SegmentId
    LEFT JOIN master.Categories   c  ON a.CategoryId    = c.CategoryId
    LEFT JOIN master.SubCategories sc ON a.SubCategoryId = sc.SubCategoryId
    LEFT JOIN master.Groups       g  ON a.GroupId       = g.GroupId
    LEFT JOIN master.Seasons      se ON a.SeasonId      = se.SeasonId
    LEFT JOIN master.Genders      gen ON a.GenderId     = gen.GenderId
    LEFT JOIN product.FootwearDetails fd ON a.ArticleId = fd.ArticleId
    WHERE a.TenantId = @TenantId
        AND (@SearchTerm IS NULL OR a.ArticleName LIKE '%' + @SearchTerm + '%' OR a.ArticleCode LIKE '%' + @SearchTerm + '%')
        AND (@BrandId    IS NULL OR a.BrandId    = @BrandId)
        AND (@CategoryId IS NULL OR a.CategoryId = @CategoryId)
        AND (@SegmentId  IS NULL OR a.SegmentId  = @SegmentId)
        AND (@SeasonId   IS NULL OR a.SeasonId   = @SeasonId)
        AND (@IsActive   IS NULL OR a.IsActive   = @IsActive)
    ORDER BY a.ArticleCode
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount FROM product.Articles a
    WHERE a.TenantId = @TenantId
        AND (@SearchTerm IS NULL OR a.ArticleName LIKE '%' + @SearchTerm + '%' OR a.ArticleCode LIKE '%' + @SearchTerm + '%')
        AND (@BrandId    IS NULL OR a.BrandId    = @BrandId)
        AND (@CategoryId IS NULL OR a.CategoryId = @CategoryId)
        AND (@SegmentId  IS NULL OR a.SegmentId  = @SegmentId)
        AND (@SeasonId   IS NULL OR a.SeasonId   = @SeasonId)
        AND (@IsActive   IS NULL OR a.IsActive   = @IsActive);
END;
GO

CREATE OR ALTER PROCEDURE product.sp_Article_GetById
    @ArticleId UNIQUEIDENTIFIER,
    @TenantId  UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.*, b.BrandName, s.SegmentName, ss.SubSegmentName,
           c.CategoryName, sc.SubCategoryName, g.GroupName,
           se.SeasonCode, gen.GenderName
    FROM product.Articles a
    LEFT JOIN master.Brands        b  ON a.BrandId       = b.BrandId
    LEFT JOIN master.Segments      s  ON a.SegmentId     = s.SegmentId
    LEFT JOIN master.SubSegments   ss ON a.SubSegmentId  = ss.SubSegmentId
    LEFT JOIN master.Categories    c  ON a.CategoryId    = c.CategoryId
    LEFT JOIN master.SubCategories sc ON a.SubCategoryId = sc.SubCategoryId
    LEFT JOIN master.Groups        g  ON a.GroupId       = g.GroupId
    LEFT JOIN master.Seasons       se ON a.SeasonId      = se.SeasonId
    LEFT JOIN master.Genders       gen ON a.GenderId     = gen.GenderId
    WHERE a.ArticleId = @ArticleId AND a.TenantId = @TenantId;

    SELECT * FROM product.FootwearDetails    WHERE ArticleId = @ArticleId;
    SELECT * FROM product.LeatherGoodsDetails WHERE ArticleId = @ArticleId;
    SELECT * FROM product.ArticleSizes        WHERE ArticleId = @ArticleId ORDER BY EuroSize;
END;
GO

CREATE OR ALTER PROCEDURE product.sp_Article_Create
    @TenantId      UNIQUEIDENTIFIER,
    @ArticleCode   NVARCHAR(50),
    @ArticleName   NVARCHAR(300),
    @BrandId       UNIQUEIDENTIFIER,
    @SegmentId     UNIQUEIDENTIFIER,
    @SubSegmentId  UNIQUEIDENTIFIER = NULL,
    @CategoryId    UNIQUEIDENTIFIER,
    @SubCategoryId UNIQUEIDENTIFIER = NULL,
    @GroupId       UNIQUEIDENTIFIER = NULL,
    @SeasonId      UNIQUEIDENTIFIER = NULL,
    @GenderId      UNIQUEIDENTIFIER,
    @Color         NVARCHAR(100),
    @Style         NVARCHAR(100) = NULL,
    @Fastener      NVARCHAR(100) = NULL,
    @HSNCode       NVARCHAR(20),
    @UOM           NVARCHAR(20) = 'PAIRS',
    @MRP           DECIMAL(12,2) = 0,
    @CBD           DECIMAL(12,2) = 0,
    @IsSizeBased   BIT = 1,
    @LaunchDate    DATE = NULL,
    @CreatedBy     UNIQUEIDENTIFIER = NULL,
    @ArticleId     UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @ArticleId = NEWID();
    INSERT INTO product.Articles (
        ArticleId, TenantId, ArticleCode, ArticleName, BrandId, SegmentId,
        SubSegmentId, CategoryId, SubCategoryId, GroupId, SeasonId, GenderId,
        Color, Style, Fastener, HSNCode, UOM, MRP, CBD, IsSizeBased, LaunchDate, CreatedBy
    ) VALUES (
        @ArticleId, @TenantId, @ArticleCode, @ArticleName, @BrandId, @SegmentId,
        @SubSegmentId, @CategoryId, @SubCategoryId, @GroupId, @SeasonId, @GenderId,
        @Color, @Style, @Fastener, @HSNCode, @UOM, @MRP, @CBD, @IsSizeBased, @LaunchDate, @CreatedBy
    );
END;
GO

CREATE OR ALTER PROCEDURE product.sp_Article_GenerateEAN
    @ArticleId   UNIQUEIDENTIFIER,
    @SizeRunFrom INT,
    @SizeRunTo   INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Size INT = @SizeRunFrom;
    DECLARE @Counter INT;
    SELECT @Counter = ISNULL(MAX(CAST(RIGHT(EANCode, 6) AS INT)), 100000)
    FROM product.ArticleSizes;

    WHILE @Size <= @SizeRunTo
    BEGIN
        SET @Counter = @Counter + 1;
        IF NOT EXISTS (SELECT 1 FROM product.ArticleSizes WHERE ArticleId = @ArticleId AND EuroSize = @Size)
            INSERT INTO product.ArticleSizes (ArticleSizeId, ArticleId, EuroSize, EANCode)
            VALUES (NEWID(), @ArticleId, @Size, '890' + RIGHT('000000' + CAST(@Counter AS NVARCHAR), 10));
        SET @Size = @Size + 1;
    END
END;
GO

-- ============================================================
-- SECTION 5: STORED PROCEDURES — INVENTORY
-- ============================================================

CREATE OR ALTER PROCEDURE inventory.sp_StockLedger_GetByWarehouse
    @TenantId   UNIQUEIDENTIFIER,
    @WarehouseId UNIQUEIDENTIFIER,
    @SearchTerm NVARCHAR(200) = NULL,
    @PageNumber INT = 1,
    @PageSize   INT = 25
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        sl.StockLedgerId, sl.WarehouseId, sl.ArticleId, sl.EuroSize,
        sl.OpeningStock, sl.InwardQty, sl.OutwardQty, sl.ClosingStock, sl.LastUpdated,
        a.ArticleCode, a.ArticleName, a.Color, a.MRP,
        w.WarehouseName
    FROM inventory.StockLedger sl
    INNER JOIN product.Articles     a ON sl.ArticleId  = a.ArticleId
    INNER JOIN warehouse.Warehouses w ON sl.WarehouseId = w.WarehouseId
    WHERE sl.TenantId = @TenantId AND sl.WarehouseId = @WarehouseId
        AND (@SearchTerm IS NULL OR a.ArticleName LIKE '%' + @SearchTerm + '%' OR a.ArticleCode LIKE '%' + @SearchTerm + '%')
    ORDER BY a.ArticleCode, sl.EuroSize
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM inventory.StockLedger sl
    INNER JOIN product.Articles a ON sl.ArticleId = a.ArticleId
    WHERE sl.TenantId = @TenantId AND sl.WarehouseId = @WarehouseId
        AND (@SearchTerm IS NULL OR a.ArticleName LIKE '%' + @SearchTerm + '%' OR a.ArticleCode LIKE '%' + @SearchTerm + '%');
END;
GO

CREATE OR ALTER PROCEDURE inventory.sp_Stock_CheckAvailability
    @TenantId    UNIQUEIDENTIFIER,
    @WarehouseId UNIQUEIDENTIFIER,
    @ArticleId   UNIQUEIDENTIFIER,
    @EuroSize    INT = NULL,
    @RequiredQty INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @AvailableStock INT;
    SELECT @AvailableStock = ISNULL(SUM(ClosingStock), 0)
    FROM inventory.StockLedger
    WHERE TenantId = @TenantId AND WarehouseId = @WarehouseId
        AND ArticleId = @ArticleId
        AND (@EuroSize IS NULL OR EuroSize = @EuroSize);

    SELECT @AvailableStock AS AvailableStock, @RequiredQty AS RequiredQty,
           CASE WHEN @AvailableStock >= @RequiredQty THEN 1 ELSE 0 END AS IsAvailable;
END;
GO

CREATE OR ALTER PROCEDURE inventory.sp_StockMovement_Record
    @TenantId      UNIQUEIDENTIFIER,
    @WarehouseId   UNIQUEIDENTIFIER,
    @ArticleId     UNIQUEIDENTIFIER,
    @EuroSize      INT = NULL,
    @MovementType  NVARCHAR(30),
    @Direction     NVARCHAR(10),
    @Quantity      INT,
    @ReferenceType NVARCHAR(50) = NULL,
    @ReferenceId   UNIQUEIDENTIFIER = NULL,
    @Notes         NVARCHAR(500) = NULL,
    @CreatedBy     UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        INSERT INTO inventory.StockMovements (
            MovementId, TenantId, WarehouseId, ArticleId, EuroSize,
            MovementType, Direction, Quantity, ReferenceType, ReferenceId, Notes, CreatedBy
        ) VALUES (
            NEWID(), @TenantId, @WarehouseId, @ArticleId, @EuroSize,
            @MovementType, @Direction, @Quantity, @ReferenceType, @ReferenceId, @Notes, @CreatedBy
        );

        IF NOT EXISTS (
            SELECT 1 FROM inventory.StockLedger
            WHERE TenantId = @TenantId AND WarehouseId = @WarehouseId
                AND ArticleId = @ArticleId AND ISNULL(EuroSize, 0) = ISNULL(@EuroSize, 0)
        )
            INSERT INTO inventory.StockLedger (StockLedgerId, TenantId, WarehouseId, ArticleId, EuroSize, OpeningStock, InwardQty, OutwardQty)
            VALUES (NEWID(), @TenantId, @WarehouseId, @ArticleId, @EuroSize, 0, 0, 0);

        IF @Direction = 'INWARD'
            UPDATE inventory.StockLedger
            SET InwardQty = InwardQty + @Quantity, LastUpdated = SYSUTCDATETIME()
            WHERE TenantId = @TenantId AND WarehouseId = @WarehouseId
                AND ArticleId = @ArticleId AND ISNULL(EuroSize, 0) = ISNULL(@EuroSize, 0);
        ELSE
            UPDATE inventory.StockLedger
            SET OutwardQty = OutwardQty + @Quantity, LastUpdated = SYSUTCDATETIME()
            WHERE TenantId = @TenantId AND WarehouseId = @WarehouseId
                AND ArticleId = @ArticleId AND ISNULL(EuroSize, 0) = ISNULL(@EuroSize, 0);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE inventory.sp_StockOverview_Get
    @TenantId    UNIQUEIDENTIFIER,
    @WarehouseId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        a.ArticleCode, a.ArticleName, a.Color,
        w.WarehouseName, w.WarehouseCode,
        SUM(sl.ClosingStock) AS TotalStock,
        SUM(CASE WHEN sl.EuroSize = 39 THEN sl.ClosingStock ELSE 0 END) AS [Size_39],
        SUM(CASE WHEN sl.EuroSize = 40 THEN sl.ClosingStock ELSE 0 END) AS [Size_40],
        SUM(CASE WHEN sl.EuroSize = 41 THEN sl.ClosingStock ELSE 0 END) AS [Size_41],
        SUM(CASE WHEN sl.EuroSize = 42 THEN sl.ClosingStock ELSE 0 END) AS [Size_42],
        SUM(CASE WHEN sl.EuroSize = 43 THEN sl.ClosingStock ELSE 0 END) AS [Size_43],
        SUM(CASE WHEN sl.EuroSize = 44 THEN sl.ClosingStock ELSE 0 END) AS [Size_44],
        SUM(CASE WHEN sl.EuroSize = 45 THEN sl.ClosingStock ELSE 0 END) AS [Size_45],
        SUM(CASE WHEN sl.EuroSize = 46 THEN sl.ClosingStock ELSE 0 END) AS [Size_46]
    FROM inventory.StockLedger sl
    INNER JOIN product.Articles     a ON sl.ArticleId  = a.ArticleId
    INNER JOIN warehouse.Warehouses w ON sl.WarehouseId = w.WarehouseId
    WHERE sl.TenantId = @TenantId
        AND (@WarehouseId IS NULL OR sl.WarehouseId = @WarehouseId)
    GROUP BY a.ArticleCode, a.ArticleName, a.Color, w.WarehouseName, w.WarehouseCode
    ORDER BY a.ArticleCode;
END;
GO

-- ============================================================
-- SECTION 6: STORED PROCEDURES — BILLING
-- ============================================================

CREATE OR ALTER PROCEDURE billing.sp_Invoice_Calculate
    @InvoiceId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @IsInterState BIT;
    SELECT @IsInterState = IsInterState FROM billing.Invoices WHERE InvoiceId = @InvoiceId;

    UPDATE il SET
        MarginAmount   = ROUND(il.MRP * il.MarginPercent / 100, 2),
        UnitPrice      = ROUND(il.MRP - (il.MRP * il.MarginPercent / 100), 2),
        TaxableAmount  = ROUND((il.MRP - (il.MRP * il.MarginPercent / 100)) * il.Quantity, 2),
        CGSTRate       = CASE WHEN @IsInterState = 0 THEN il.GSTRate / 2 ELSE 0 END,
        SGSTRate       = CASE WHEN @IsInterState = 0 THEN il.GSTRate / 2 ELSE 0 END,
        IGSTRate       = CASE WHEN @IsInterState = 1 THEN il.GSTRate    ELSE 0 END,
        CGSTAmount     = CASE WHEN @IsInterState = 0
                            THEN ROUND(((il.MRP - (il.MRP * il.MarginPercent / 100)) * il.Quantity) * (il.GSTRate / 2) / 100, 2)
                            ELSE 0 END,
        SGSTAmount     = CASE WHEN @IsInterState = 0
                            THEN ROUND(((il.MRP - (il.MRP * il.MarginPercent / 100)) * il.Quantity) * (il.GSTRate / 2) / 100, 2)
                            ELSE 0 END,
        IGSTAmount     = CASE WHEN @IsInterState = 1
                            THEN ROUND(((il.MRP - (il.MRP * il.MarginPercent / 100)) * il.Quantity) * il.GSTRate / 100, 2)
                            ELSE 0 END,
        TotalAmount    = ROUND(
                            ((il.MRP - (il.MRP * il.MarginPercent / 100)) * il.Quantity) +
                            ((il.MRP - (il.MRP * il.MarginPercent / 100)) * il.Quantity * il.GSTRate / 100), 2)
    FROM billing.InvoiceLines il
    WHERE il.InvoiceId = @InvoiceId;

    UPDATE inv SET
        SubTotal      = t.SubTotal,
        TotalDiscount = t.TotalDiscount,
        TaxableAmount = t.TaxableAmount,
        CGSTAmount    = t.CGSTAmount,
        SGSTAmount    = t.SGSTAmount,
        IGSTAmount    = t.IGSTAmount,
        TotalGST      = t.TotalGST,
        GrandTotal    = t.GrandTotal,
        RoundOff      = ROUND(t.GrandTotal, 0) - t.GrandTotal,
        NetPayable    = ROUND(t.GrandTotal, 0),
        UpdatedAt     = SYSUTCDATETIME()
    FROM billing.Invoices inv
    CROSS APPLY (
        SELECT
            SUM(MRP * Quantity)                         AS SubTotal,
            SUM(MarginAmount * Quantity)                AS TotalDiscount,
            SUM(TaxableAmount)                          AS TaxableAmount,
            SUM(CGSTAmount)                             AS CGSTAmount,
            SUM(SGSTAmount)                             AS SGSTAmount,
            SUM(IGSTAmount)                             AS IGSTAmount,
            SUM(CGSTAmount + SGSTAmount + IGSTAmount)   AS TotalGST,
            SUM(TotalAmount)                            AS GrandTotal
        FROM billing.InvoiceLines WHERE InvoiceId = @InvoiceId
    ) t
    WHERE inv.InvoiceId = @InvoiceId;
END;
GO

CREATE OR ALTER PROCEDURE billing.sp_Invoice_GetById
    @InvoiceId UNIQUEIDENTIFIER,
    @TenantId  UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.*, c.ClientName, c.ClientCode, s.StoreName, s.StoreCode
    FROM billing.Invoices i
    INNER JOIN sales.Clients c ON i.ClientId = c.ClientId
    INNER JOIN sales.Stores  s ON i.StoreId  = s.StoreId
    WHERE i.InvoiceId = @InvoiceId AND i.TenantId = @TenantId;

    SELECT il.* FROM billing.InvoiceLines il
    WHERE il.InvoiceId = @InvoiceId ORDER BY il.ArticleCode, il.EuroSize;

    SELECT pl.*, pll.*
    FROM billing.PackingLists pl
    LEFT JOIN billing.PackingListLines pll ON pl.PackingListId = pll.PackingListId
    WHERE pl.InvoiceId = @InvoiceId;
END;
GO

CREATE OR ALTER PROCEDURE billing.sp_GSTReport_Get
    @TenantId  UNIQUEIDENTIFIER,
    @FromDate  DATE,
    @ToDate    DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        i.InvoiceNo, i.InvoiceDate, i.InvoiceType,
        c.ClientName, c.GSTIN AS ClientGSTIN,
        i.PlaceOfSupply, i.IsInterState,
        il.HSNCode, il.GSTRate,
        SUM(il.Quantity)      AS TotalQty,
        SUM(il.TaxableAmount) AS TaxableAmount,
        SUM(il.CGSTAmount)    AS CGST,
        SUM(il.SGSTAmount)    AS SGST,
        SUM(il.IGSTAmount)    AS IGST,
        SUM(il.TotalAmount)   AS TotalAmount
    FROM billing.Invoices i
    INNER JOIN billing.InvoiceLines il ON i.InvoiceId = il.InvoiceId
    INNER JOIN sales.Clients        c  ON i.ClientId  = c.ClientId
    WHERE i.TenantId = @TenantId
        AND i.InvoiceDate BETWEEN @FromDate AND @ToDate
        AND i.Status NOT IN ('Cancelled','CANCELLED')
    GROUP BY i.InvoiceNo, i.InvoiceDate, i.InvoiceType,
             c.ClientName, c.GSTIN, i.PlaceOfSupply, i.IsInterState,
             il.HSNCode, il.GSTRate
    ORDER BY i.InvoiceDate, i.InvoiceNo;
END;
GO

PRINT '=== FILE 2 COMPLETE: All indexes and stored procedures created ===';
GO
