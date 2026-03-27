-- Fix missing inventory tables and column issues for StockController
USE RetailERP;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- 1. Create inventory.StockLedger (missing from DB)
--    Referenced by sp_StockMovement_Record and GET /api/stock
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockLedger' AND schema_id=SCHEMA_ID('inventory'))
BEGIN
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
    PRINT 'Created inventory.StockLedger';
END
ELSE
    PRINT 'inventory.StockLedger already exists';
GO

-- ============================================================
-- 2. Create inventory.Dispatches
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Dispatches' AND schema_id=SCHEMA_ID('inventory'))
BEGIN
    CREATE TABLE inventory.Dispatches (
        DispatchId          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
        TenantId            UNIQUEIDENTIFIER    NOT NULL,
        DispatchNumber      NVARCHAR(50)        NOT NULL,
        WarehouseId         UNIQUEIDENTIFIER    NOT NULL,
        ClientId            UNIQUEIDENTIFIER    NULL,
        StoreId             UNIQUEIDENTIFIER    NULL,
        DispatchDate        DATE                NOT NULL DEFAULT GETDATE(),
        ReferenceOrderNo    NVARCHAR(100)       NULL,
        TransportMode       NVARCHAR(50)        NULL,
        VehicleNo           NVARCHAR(50)        NULL,
        LogisticsPartner    NVARCHAR(100)       NULL,
        Status              NVARCHAR(20)        NOT NULL DEFAULT 'Dispatched',
        TotalQuantity       INT                 NOT NULL DEFAULT 0,
        Notes               NVARCHAR(500)       NULL,
        CreatedAt           DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt           DATETIME2(7)        NULL,
        CreatedBy           UNIQUEIDENTIFIER    NULL,
        CONSTRAINT PK_Dispatches PRIMARY KEY (DispatchId),
        CONSTRAINT FK_Dispatches_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
        CONSTRAINT FK_Dispatches_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId)
    );
    PRINT 'Created inventory.Dispatches';
END
ELSE
    PRINT 'inventory.Dispatches already exists';
GO

-- ============================================================
-- 3. Create inventory.DispatchLines
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='DispatchLines' AND schema_id=SCHEMA_ID('inventory'))
BEGIN
    CREATE TABLE inventory.DispatchLines (
        DispatchLineId  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
        DispatchId      UNIQUEIDENTIFIER    NOT NULL,
        ArticleId       UNIQUEIDENTIFIER    NOT NULL,
        EuroSize        INT                 NULL,
        Quantity        INT                 NOT NULL DEFAULT 0,
        CONSTRAINT PK_DispatchLines PRIMARY KEY (DispatchLineId),
        CONSTRAINT FK_DispatchLines_Dispatch FOREIGN KEY (DispatchId) REFERENCES inventory.Dispatches(DispatchId),
        CONSTRAINT FK_DispatchLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
    );
    PRINT 'Created inventory.DispatchLines';
END
ELSE
    PRINT 'inventory.DispatchLines already exists';
GO

-- ============================================================
-- 4. Create inventory.StockReturns
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockReturns' AND schema_id=SCHEMA_ID('inventory'))
BEGIN
    CREATE TABLE inventory.StockReturns (
        ReturnId        UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
        TenantId        UNIQUEIDENTIFIER    NOT NULL,
        ReturnNumber    NVARCHAR(50)        NOT NULL,
        WarehouseId     UNIQUEIDENTIFIER    NOT NULL,
        ClientId        UNIQUEIDENTIFIER    NULL,
        StoreId         UNIQUEIDENTIFIER    NULL,
        ReturnDate      DATE                NOT NULL DEFAULT GETDATE(),
        Reason          NVARCHAR(500)       NOT NULL,
        Status          NVARCHAR(20)        NOT NULL DEFAULT 'Received',
        TotalQuantity   INT                 NOT NULL DEFAULT 0,
        Notes           NVARCHAR(500)       NULL,
        CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2(7)        NULL,
        CreatedBy       UNIQUEIDENTIFIER    NULL,
        CONSTRAINT PK_StockReturns PRIMARY KEY (ReturnId),
        CONSTRAINT FK_StockReturns_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
        CONSTRAINT FK_StockReturns_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId)
    );
    PRINT 'Created inventory.StockReturns';
END
ELSE
    PRINT 'inventory.StockReturns already exists';
GO

-- ============================================================
-- 5. Create inventory.ReturnLines
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='ReturnLines' AND schema_id=SCHEMA_ID('inventory'))
BEGIN
    CREATE TABLE inventory.ReturnLines (
        ReturnLineId    UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
        ReturnId        UNIQUEIDENTIFIER    NOT NULL,
        ArticleId       UNIQUEIDENTIFIER    NOT NULL,
        EuroSize        INT                 NULL,
        Quantity        INT                 NOT NULL DEFAULT 0,
        CONSTRAINT PK_ReturnLines PRIMARY KEY (ReturnLineId),
        CONSTRAINT FK_ReturnLines_Return FOREIGN KEY (ReturnId) REFERENCES inventory.StockReturns(ReturnId),
        CONSTRAINT FK_ReturnLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
    );
    PRINT 'Created inventory.ReturnLines';
END
ELSE
    PRINT 'inventory.ReturnLines already exists';
GO

-- ============================================================
-- 6. Alter inventory.StockAdjustments — add missing columns
--    Controller uses: AdjustmentNumber, AdjustmentType (header-level),
--    TotalQuantity, Notes, UpdatedAt, RejectedBy, RejectedAt,
--    RejectionReason, AppliedAt
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='AdjustmentNumber')
    ALTER TABLE inventory.StockAdjustments ADD AdjustmentNumber NVARCHAR(50) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='AdjustmentType')
    ALTER TABLE inventory.StockAdjustments ADD AdjustmentType NVARCHAR(10) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='TotalQuantity')
    ALTER TABLE inventory.StockAdjustments ADD TotalQuantity INT NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='Notes')
    ALTER TABLE inventory.StockAdjustments ADD Notes NVARCHAR(500) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='UpdatedAt')
    ALTER TABLE inventory.StockAdjustments ADD UpdatedAt DATETIME2(7) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='RejectedBy')
    ALTER TABLE inventory.StockAdjustments ADD RejectedBy UNIQUEIDENTIFIER NULL;
GO
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='RejectedAt')
    ALTER TABLE inventory.StockAdjustments ADD RejectedAt DATETIME2(7) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='RejectionReason')
    ALTER TABLE inventory.StockAdjustments ADD RejectionReason NVARCHAR(500) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='AppliedAt')
    ALTER TABLE inventory.StockAdjustments ADD AppliedAt DATETIME2(7) NULL;
GO
PRINT 'StockAdjustments columns added';
GO

-- ============================================================
-- 7. Make StockAdjustmentLines.AdjustmentType nullable
--    Controller inserts lines without AdjustmentType (header-level type is used)
-- ============================================================
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustmentLines'
    AND COLUMN_NAME='AdjustmentType' AND IS_NULLABLE='NO'
)
BEGIN
    ALTER TABLE inventory.StockAdjustmentLines ALTER COLUMN AdjustmentType NVARCHAR(10) NULL;
    PRINT 'StockAdjustmentLines.AdjustmentType made nullable';
END
GO

-- ============================================================
-- 8. Fix StockMovements CHECK constraint to include DISPATCH
--    Controller uses MovementType='DISPATCH' for outward movements
-- ============================================================
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_StockMovements_Type' AND parent_object_id=OBJECT_ID('inventory.StockMovements'))
BEGIN
    ALTER TABLE inventory.StockMovements DROP CONSTRAINT CK_StockMovements_Type;
    PRINT 'Dropped CK_StockMovements_Type';
END
GO
ALTER TABLE inventory.StockMovements ADD CONSTRAINT CK_StockMovements_Type
    CHECK (MovementType IN ('OPENING','PURCHASE','PRODUCTION','SALES','RETURN','ADJUSTMENT','DISPATCH'));
GO
PRINT 'Added updated CK_StockMovements_Type with DISPATCH';
GO
