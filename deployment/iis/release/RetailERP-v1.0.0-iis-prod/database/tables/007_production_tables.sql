-- ============================================================
-- RetailERP - Production Order Tables
-- ============================================================
USE RetailERP;
GO

CREATE TABLE production.ProductionOrders (
    ProductionOrderId UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    OrderNo         NVARCHAR(50)        NOT NULL,
    OrderDate       DATE                NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    GroupId         UNIQUEIDENTIFIER    NULL,
    Color           NVARCHAR(100)       NOT NULL,
    Last            NVARCHAR(100)       NULL,
    UpperLeather    NVARCHAR(200)       NULL,
    LiningLeather   NVARCHAR(200)       NULL,
    Sole            NVARCHAR(200)       NULL,
    OrderType       NVARCHAR(50)        NOT NULL DEFAULT 'REPLENISHMENT', -- REPLENISHMENT, FRESH, SAMPLE
    TotalQuantity   INT                 NOT NULL DEFAULT 0,
    Status          NVARCHAR(30)        NOT NULL DEFAULT 'DRAFT', -- DRAFT, APPROVED, IN_PRODUCTION, COMPLETED, CANCELLED
    UpperCuttingDies NVARCHAR(100)      NULL,
    MaterialCuttingDies NVARCHAR(100)   NULL,
    SocksInsoleCuttingDies NVARCHAR(100) NULL,
    Notes           NVARCHAR(1000)      NULL,
    ApprovedBy      UNIQUEIDENTIFIER    NULL,
    ApprovedAt      DATETIME2(7)        NULL,
    CompletedAt     DATETIME2(7)        NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_ProductionOrders PRIMARY KEY (ProductionOrderId),
    CONSTRAINT FK_ProdOrders_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_ProdOrders_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT UQ_ProdOrders_No_Tenant UNIQUE (TenantId, OrderNo),
    CONSTRAINT CK_ProdOrders_Status CHECK (Status IN ('DRAFT','APPROVED','IN_PRODUCTION','COMPLETED','CANCELLED'))
);
GO

-- Size-wise quantity distribution for production orders
CREATE TABLE production.ProductionSizeRuns (
    SizeRunId       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    ProductionOrderId UNIQUEIDENTIFIER  NOT NULL,
    EuroSize        INT                 NOT NULL,
    Quantity        INT                 NOT NULL DEFAULT 0,
    ProducedQty     INT                 NOT NULL DEFAULT 0,
    CONSTRAINT PK_ProductionSizeRuns PRIMARY KEY (SizeRunId),
    CONSTRAINT FK_ProdSizeRun_Order FOREIGN KEY (ProductionOrderId) REFERENCES production.ProductionOrders(ProductionOrderId),
    CONSTRAINT UQ_ProdSizeRun UNIQUE (ProductionOrderId, EuroSize),
    CONSTRAINT CK_ProdSizeRun_Qty CHECK (Quantity >= 0),
    CONSTRAINT CK_ProdSizeRun_Produced CHECK (ProducedQty >= 0 AND ProducedQty <= Quantity)
);
GO
