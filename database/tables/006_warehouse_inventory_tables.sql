-- ============================================================
-- RetailERP - Warehouse & Inventory Tables
-- ============================================================
USE RetailERP;
GO

CREATE TABLE warehouse.Warehouses (
    WarehouseId     UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    WarehouseCode   NVARCHAR(50)        NOT NULL,
    WarehouseName   NVARCHAR(300)       NOT NULL,
    Address         NVARCHAR(500)       NULL,
    City            NVARCHAR(100)       NULL,
    State           NVARCHAR(100)       NULL,
    PinCode         NVARCHAR(10)        NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Warehouses PRIMARY KEY (WarehouseId),
    CONSTRAINT FK_Warehouses_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Warehouses_Code_Tenant UNIQUE (TenantId, WarehouseCode)
);
GO

-- Stock Ledger (current stock per article/size/warehouse)
CREATE TABLE inventory.StockLedger (
    StockLedgerId   UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    WarehouseId     UNIQUEIDENTIFIER    NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NULL,
    OpeningStock    INT                 NOT NULL DEFAULT 0,
    InwardQty       INT                 NOT NULL DEFAULT 0,
    OutwardQty      INT                 NOT NULL DEFAULT 0,
    ClosingStock    AS (OpeningStock + InwardQty - OutwardQty) PERSISTED,
    LastUpdated     DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_StockLedger PRIMARY KEY (StockLedgerId),
    CONSTRAINT FK_StockLedger_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_StockLedger_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT FK_StockLedger_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT UQ_StockLedger UNIQUE (TenantId, WarehouseId, ArticleId, EuroSize),
    CONSTRAINT CK_StockLedger_Positive CHECK (OpeningStock + InwardQty - OutwardQty >= 0)
);
GO

-- Stock Movements (transaction log)
CREATE TABLE inventory.StockMovements (
    MovementId      UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    WarehouseId     UNIQUEIDENTIFIER    NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NULL,
    MovementType    NVARCHAR(30)        NOT NULL, -- OPENING, PURCHASE, PRODUCTION, SALES, RETURN, ADJUSTMENT
    Direction       NVARCHAR(10)        NOT NULL, -- INWARD, OUTWARD
    Quantity        INT                 NOT NULL,
    ReferenceType   NVARCHAR(50)        NULL,     -- ProductionOrder, CustomerOrder, StockAdjustment
    ReferenceId     UNIQUEIDENTIFIER    NULL,
    Notes           NVARCHAR(500)       NULL,
    MovementDate    DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_StockMovements PRIMARY KEY (MovementId),
    CONSTRAINT FK_StockMovements_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_StockMovements_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT FK_StockMovements_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT CK_StockMovements_Qty CHECK (Quantity > 0),
    CONSTRAINT CK_StockMovements_Dir CHECK (Direction IN ('INWARD', 'OUTWARD')),
    CONSTRAINT CK_StockMovements_Type CHECK (MovementType IN ('OPENING','PURCHASE','PRODUCTION','SALES','RETURN','ADJUSTMENT'))
);
GO

-- Stock Adjustments
CREATE TABLE inventory.StockAdjustments (
    AdjustmentId    UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    WarehouseId     UNIQUEIDENTIFIER    NOT NULL,
    AdjustmentNo    NVARCHAR(50)        NOT NULL,
    AdjustmentDate  DATE                NOT NULL,
    Reason          NVARCHAR(500)       NULL,
    Status          NVARCHAR(20)        NOT NULL DEFAULT 'DRAFT', -- DRAFT, APPROVED, CANCELLED
    ApprovedBy      UNIQUEIDENTIFIER    NULL,
    ApprovedAt      DATETIME2(7)        NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_StockAdjustments PRIMARY KEY (AdjustmentId),
    CONSTRAINT FK_StockAdj_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_StockAdj_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId)
);
GO

CREATE TABLE inventory.StockAdjustmentLines (
    AdjustmentLineId UNIQUEIDENTIFIER   NOT NULL DEFAULT NEWSEQUENTIALID(),
    AdjustmentId    UNIQUEIDENTIFIER    NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NULL,
    AdjustmentType  NVARCHAR(10)        NOT NULL, -- ADD, REMOVE
    Quantity        INT                 NOT NULL,
    CONSTRAINT PK_StockAdjustmentLines PRIMARY KEY (AdjustmentLineId),
    CONSTRAINT FK_SAL_Adjustment FOREIGN KEY (AdjustmentId) REFERENCES inventory.StockAdjustments(AdjustmentId),
    CONSTRAINT FK_SAL_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO
