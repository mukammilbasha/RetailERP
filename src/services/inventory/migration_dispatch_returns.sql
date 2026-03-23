-- ============================================================
-- RetailERP Inventory Service — Migration: Dispatch & Returns
-- Created: 2026-03-22
-- Run once against the RetailERP database.
-- Safe to re-run: all DDL is guarded with IF NOT EXISTS checks.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Dispatch table
-- ────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='Dispatches')
BEGIN
  CREATE TABLE inventory.Dispatches (
    DispatchId          UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    TenantId            UNIQUEIDENTIFIER  NOT NULL,
    DispatchNumber      NVARCHAR(30)      NOT NULL,
    WarehouseId         UNIQUEIDENTIFIER  NOT NULL REFERENCES warehouse.Warehouses(WarehouseId),
    ClientId            UNIQUEIDENTIFIER  NULL,
    StoreId             UNIQUEIDENTIFIER  NULL,
    DispatchDate        DATE              NOT NULL DEFAULT GETUTCDATE(),
    ReferenceOrderNo    NVARCHAR(50)      NULL,
    TransportMode       NVARCHAR(30)      NULL,
    VehicleNo           NVARCHAR(20)      NULL,
    LogisticsPartner    NVARCHAR(100)     NULL,
    Status              NVARCHAR(20)      NOT NULL DEFAULT 'Dispatched', -- Dispatched, Delivered, Cancelled
    TotalQuantity       INT               NOT NULL DEFAULT 0,
    Notes               NVARCHAR(500)     NULL,
    CreatedBy           UNIQUEIDENTIFIER  NOT NULL,
    CreatedAt           DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2         NULL,
    CONSTRAINT UQ_Dispatches_Number UNIQUE (TenantId, DispatchNumber)
  );
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='DispatchLines')
BEGIN
  CREATE TABLE inventory.DispatchLines (
    DispatchLineId  UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    DispatchId      UNIQUEIDENTIFIER  NOT NULL REFERENCES inventory.Dispatches(DispatchId),
    ArticleId       UNIQUEIDENTIFIER  NOT NULL,
    EuroSize        NVARCHAR(10)      NULL,
    Quantity        INT               NOT NULL CHECK (Quantity > 0)
  );
END

-- ────────────────────────────────────────────────────────────
-- Returns table
-- ────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockReturns')
BEGIN
  CREATE TABLE inventory.StockReturns (
    ReturnId        UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    TenantId        UNIQUEIDENTIFIER  NOT NULL,
    ReturnNumber    NVARCHAR(30)      NOT NULL,
    WarehouseId     UNIQUEIDENTIFIER  NOT NULL REFERENCES warehouse.Warehouses(WarehouseId),
    ClientId        UNIQUEIDENTIFIER  NULL,
    StoreId         UNIQUEIDENTIFIER  NULL,
    ReturnDate      DATE              NOT NULL DEFAULT GETUTCDATE(),
    Reason          NVARCHAR(100)     NOT NULL,
    Status          NVARCHAR(20)      NOT NULL DEFAULT 'Received', -- Received, Inspected, Restocked, Rejected
    TotalQuantity   INT               NOT NULL DEFAULT 0,
    Notes           NVARCHAR(500)     NULL,
    CreatedBy       UNIQUEIDENTIFIER  NOT NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2         NULL,
    CONSTRAINT UQ_Returns_Number UNIQUE (TenantId, ReturnNumber)
  );
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='ReturnLines')
BEGIN
  CREATE TABLE inventory.ReturnLines (
    ReturnLineId  UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    ReturnId      UNIQUEIDENTIFIER  NOT NULL REFERENCES inventory.StockReturns(ReturnId),
    ArticleId     UNIQUEIDENTIFIER  NOT NULL,
    EuroSize      NVARCHAR(10)      NULL,
    Quantity      INT               NOT NULL CHECK (Quantity > 0)
  );
END

-- ────────────────────────────────────────────────────────────
-- Stock Adjustments — add approval/rejection/applied columns
-- Note: ApprovedBy and ApprovedAt may already exist from the
--       initial schema. Each column is guarded individually.
-- ────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='ApprovedBy')
  ALTER TABLE inventory.StockAdjustments ADD ApprovedBy UNIQUEIDENTIFIER NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='ApprovedAt')
  ALTER TABLE inventory.StockAdjustments ADD ApprovedAt DATETIME2 NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='AppliedAt')
  ALTER TABLE inventory.StockAdjustments ADD AppliedAt DATETIME2 NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='RejectedBy')
  ALTER TABLE inventory.StockAdjustments ADD RejectedBy UNIQUEIDENTIFIER NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='RejectedAt')
  ALTER TABLE inventory.StockAdjustments ADD RejectedAt DATETIME2 NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='RejectionReason')
  ALTER TABLE inventory.StockAdjustments ADD RejectionReason NVARCHAR(500) NULL;

-- AdjustmentNumber is used by the new endpoints (the original schema has AdjustmentNo).
-- Add AdjustmentNumber as the canonical number column used by the API.
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='AdjustmentNumber')
  ALTER TABLE inventory.StockAdjustments ADD AdjustmentNumber NVARCHAR(30) NULL;

-- AdjustmentType (Add / Remove) used by the new endpoints.
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='AdjustmentType')
  ALTER TABLE inventory.StockAdjustments ADD AdjustmentType NVARCHAR(20) NULL;

-- TotalQuantity summary column.
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='TotalQuantity')
  ALTER TABLE inventory.StockAdjustments ADD TotalQuantity INT NOT NULL DEFAULT 0;

-- Notes free-text column.
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='Notes')
  ALTER TABLE inventory.StockAdjustments ADD Notes NVARCHAR(500) NULL;

-- UpdatedAt audit column.
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='inventory' AND TABLE_NAME='StockAdjustments' AND COLUMN_NAME='UpdatedAt')
  ALTER TABLE inventory.StockAdjustments ADD UpdatedAt DATETIME2 NULL;
