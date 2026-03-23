-- ============================================================
-- Migration 014: Fix billing schema to match EF entities
-- Adds all missing columns; fixes FK on DeliveryNotes
-- Safe to run multiple times (IF NOT EXISTS guards)
-- ============================================================
USE RetailERP;
GO

-- ─── billing.Invoices ──────────────────────────────────────────────
-- Add all columns required by the EF Invoice entity

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='IsActive')
    ALTER TABLE billing.Invoices ADD IsActive BIT NOT NULL DEFAULT 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='OrderNumber')
    ALTER TABLE billing.Invoices ADD OrderNumber NVARCHAR(100) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='ClientAddress')
    ALTER TABLE billing.Invoices ADD ClientAddress NVARCHAR(1000) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='StoreName')
    ALTER TABLE billing.Invoices ADD StoreName NVARCHAR(250) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='DueDate')
    ALTER TABLE billing.Invoices ADD DueDate DATE NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='SalesType')
    ALTER TABLE billing.Invoices ADD SalesType NVARCHAR(20) NOT NULL DEFAULT 'Local';
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='PONumber')
    ALTER TABLE billing.Invoices ADD PONumber NVARCHAR(100) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='PODate')
    ALTER TABLE billing.Invoices ADD PODate DATE NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='CartonBoxes')
    ALTER TABLE billing.Invoices ADD CartonBoxes INT NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='Logistic')
    ALTER TABLE billing.Invoices ADD Logistic NVARCHAR(250) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='TransportMode')
    ALTER TABLE billing.Invoices ADD TransportMode NVARCHAR(100) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='VehicleNo')
    ALTER TABLE billing.Invoices ADD VehicleNo NVARCHAR(50) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='SellerState')
    ALTER TABLE billing.Invoices ADD SellerState NVARCHAR(100) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='BuyerState')
    ALTER TABLE billing.Invoices ADD BuyerState NVARCHAR(100) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='DiscountAmount')
    ALTER TABLE billing.Invoices ADD DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='CGSTTotal')
    ALTER TABLE billing.Invoices ADD CGSTTotal DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='SGSTTotal')
    ALTER TABLE billing.Invoices ADD SGSTTotal DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='IGSTTotal')
    ALTER TABLE billing.Invoices ADD IGSTTotal DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='TotalTax')
    ALTER TABLE billing.Invoices ADD TotalTax DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='TotalAmount')
    ALTER TABLE billing.Invoices ADD TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='PaidAmount')
    ALTER TABLE billing.Invoices ADD PaidAmount DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='TotalMarginAmount')
    ALTER TABLE billing.Invoices ADD TotalMarginAmount DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='TotalGSTPayableValue')
    ALTER TABLE billing.Invoices ADD TotalGSTPayableValue DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='TotalBillingExclGST')
    ALTER TABLE billing.Invoices ADD TotalBillingExclGST DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='TotalGSTReimbursementValue')
    ALTER TABLE billing.Invoices ADD TotalGSTReimbursementValue DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='TotalBillingInclGST')
    ALTER TABLE billing.Invoices ADD TotalBillingInclGST DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='TotalQuantity')
    ALTER TABLE billing.Invoices ADD TotalQuantity INT NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='CompanyName')
    ALTER TABLE billing.Invoices ADD CompanyName NVARCHAR(500) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='CompanyAddress')
    ALTER TABLE billing.Invoices ADD CompanyAddress NVARCHAR(1000) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='CompanyGSTIN')
    ALTER TABLE billing.Invoices ADD CompanyGSTIN NVARCHAR(20) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='CompanyPAN')
    ALTER TABLE billing.Invoices ADD CompanyPAN NVARCHAR(20) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='BankName')
    ALTER TABLE billing.Invoices ADD BankName NVARCHAR(250) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='BankAccountNo')
    ALTER TABLE billing.Invoices ADD BankAccountNo NVARCHAR(50) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='BankIFSC')
    ALTER TABLE billing.Invoices ADD BankIFSC NVARCHAR(20) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='BankBranch')
    ALTER TABLE billing.Invoices ADD BankBranch NVARCHAR(250) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.Invoices') AND name='Notes')
    ALTER TABLE billing.Invoices ADD Notes NVARCHAR(2000) NULL;
GO

-- Rename Status values to match entity (DRAFT→Draft, FINALIZED→Issued, CANCELLED→Cancelled)
UPDATE billing.Invoices SET Status = 'Draft'     WHERE Status = 'DRAFT';
UPDATE billing.Invoices SET Status = 'Issued'    WHERE Status = 'FINALIZED';
UPDATE billing.Invoices SET Status = 'Cancelled' WHERE Status = 'CANCELLED';
GO

-- ─── billing.InvoiceLines ───────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.InvoiceLines') AND name='LineNumber')
    ALTER TABLE billing.InvoiceLines ADD LineNumber INT NOT NULL DEFAULT 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.InvoiceLines') AND name='SKU')
    ALTER TABLE billing.InvoiceLines ADD SKU NVARCHAR(100) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.InvoiceLines') AND name='Description')
    ALTER TABLE billing.InvoiceLines ADD Description NVARCHAR(1000) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.InvoiceLines') AND name='Size')
    ALTER TABLE billing.InvoiceLines ADD Size NVARCHAR(50) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.InvoiceLines') AND name='SizeBreakdownJson')
    ALTER TABLE billing.InvoiceLines ADD SizeBreakdownJson NVARCHAR(2000) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.InvoiceLines') AND name='GSTPayablePercent')
    ALTER TABLE billing.InvoiceLines ADD GSTPayablePercent DECIMAL(5,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.InvoiceLines') AND name='GSTPayableValue')
    ALTER TABLE billing.InvoiceLines ADD GSTPayableValue DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.InvoiceLines') AND name='GSTReimbursementPercent')
    ALTER TABLE billing.InvoiceLines ADD GSTReimbursementPercent DECIMAL(5,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.InvoiceLines') AND name='GSTReimbursementValue')
    ALTER TABLE billing.InvoiceLines ADD GSTReimbursementValue DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.InvoiceLines') AND name='TotalBilling')
    ALTER TABLE billing.InvoiceLines ADD TotalBilling DECIMAL(18,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.InvoiceLines') AND name='LineTotal')
    ALTER TABLE billing.InvoiceLines ADD LineTotal DECIMAL(18,2) NOT NULL DEFAULT 0;
GO

-- ─── billing.PackingLists ───────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.PackingLists') AND name='Status')
    ALTER TABLE billing.PackingLists ADD Status NVARCHAR(20) NOT NULL DEFAULT 'Draft';
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.PackingLists') AND name='TotalWeight')
    ALTER TABLE billing.PackingLists ADD TotalWeight DECIMAL(10,2) NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.PackingLists') AND name='WarehouseId')
    ALTER TABLE billing.PackingLists ADD WarehouseId UNIQUEIDENTIFIER NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.PackingLists') AND name='PackingDate')
    ALTER TABLE billing.PackingLists ADD PackingDate DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE);
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.PackingLists') AND name='IsActive')
    ALTER TABLE billing.PackingLists ADD IsActive BIT NOT NULL DEFAULT 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.PackingLists') AND name='UpdatedAt')
    ALTER TABLE billing.PackingLists ADD UpdatedAt DATETIME2(7) NULL;
GO

-- ─── billing.PackingListLines ───────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.PackingListLines') AND name='SKU')
    ALTER TABLE billing.PackingListLines ADD SKU NVARCHAR(100) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.PackingListLines') AND name='ArticleName')
    ALTER TABLE billing.PackingListLines ADD ArticleName NVARCHAR(500) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.PackingListLines') AND name='Description')
    ALTER TABLE billing.PackingListLines ADD Description NVARCHAR(1000) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.PackingListLines') AND name='Color')
    ALTER TABLE billing.PackingListLines ADD Color NVARCHAR(100) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.PackingListLines') AND name='HSNCode')
    ALTER TABLE billing.PackingListLines ADD HSNCode NVARCHAR(20) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.PackingListLines') AND name='SizeBreakdownJson')
    ALTER TABLE billing.PackingListLines ADD SizeBreakdownJson NVARCHAR(2000) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.PackingListLines') AND name='Weight')
    ALTER TABLE billing.PackingListLines ADD Weight DECIMAL(10,2) NOT NULL DEFAULT 0;
GO

-- ─── billing.DeliveryNotes ──────────────────────────────────────────
-- Fix FK: entity uses PackingListId, old schema had InvoiceId
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_DelNotes_Invoice')
    ALTER TABLE billing.DeliveryNotes DROP CONSTRAINT FK_DelNotes_Invoice;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.DeliveryNotes') AND name='PackingListId')
    ALTER TABLE billing.DeliveryNotes ADD PackingListId UNIQUEIDENTIFIER NULL;
GO
-- Backfill PackingListId where possible (first packing list per invoice)
UPDATE dn
SET dn.PackingListId = (
    SELECT TOP 1 pl.PackingListId
    FROM billing.PackingLists pl
    WHERE pl.InvoiceId = dn.InvoiceId
    ORDER BY pl.CreatedAt
)
FROM billing.DeliveryNotes dn
WHERE dn.PackingListId IS NULL AND EXISTS (
    SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.DeliveryNotes') AND name='InvoiceId'
);
GO
-- Add FK on PackingListId (nullable so old rows without match are fine)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_DelNotes_PackingList')
    ALTER TABLE billing.DeliveryNotes
        ADD CONSTRAINT FK_DelNotes_PackingList
        FOREIGN KEY (PackingListId) REFERENCES billing.PackingLists(PackingListId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.DeliveryNotes') AND name='TransporterName')
    ALTER TABLE billing.DeliveryNotes ADD TransporterName NVARCHAR(250) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.DeliveryNotes') AND name='VehicleNumber')
    ALTER TABLE billing.DeliveryNotes ADD VehicleNumber NVARCHAR(50) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.DeliveryNotes') AND name='LRNumber')
    ALTER TABLE billing.DeliveryNotes ADD LRNumber NVARCHAR(100) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.DeliveryNotes') AND name='DispatchDate')
    ALTER TABLE billing.DeliveryNotes ADD DispatchDate DATE NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.DeliveryNotes') AND name='DeliveryDate')
    ALTER TABLE billing.DeliveryNotes ADD DeliveryDate DATE NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.DeliveryNotes') AND name='IsActive')
    ALTER TABLE billing.DeliveryNotes ADD IsActive BIT NOT NULL DEFAULT 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.DeliveryNotes') AND name='UpdatedAt')
    ALTER TABLE billing.DeliveryNotes ADD UpdatedAt DATETIME2(7) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('billing.DeliveryNotes') AND name='CreatedBy')
    ALTER TABLE billing.DeliveryNotes ADD CreatedBy UNIQUEIDENTIFIER NULL;
GO

-- Fix Status values for DeliveryNotes to match entity
UPDATE billing.DeliveryNotes SET Status = 'Created'   WHERE Status = 'PENDING';
UPDATE billing.DeliveryNotes SET Status = 'Delivered' WHERE Status = 'DELIVERED';
GO

-- ─── Indexes ────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Invoices_Tenant_Date' AND object_id=OBJECT_ID('billing.Invoices'))
    CREATE INDEX IX_Invoices_Tenant_Date ON billing.Invoices (TenantId, InvoiceDate DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Invoices_Tenant_Status' AND object_id=OBJECT_ID('billing.Invoices'))
    CREATE INDEX IX_Invoices_Tenant_Status ON billing.Invoices (TenantId, Status);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_PackingLists_Tenant_Invoice' AND object_id=OBJECT_ID('billing.PackingLists'))
    CREATE INDEX IX_PackingLists_Tenant_Invoice ON billing.PackingLists (TenantId, InvoiceId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_InvoiceLines_Invoice' AND object_id=OBJECT_ID('billing.InvoiceLines'))
    CREATE INDEX IX_InvoiceLines_Invoice ON billing.InvoiceLines (InvoiceId);
GO

PRINT 'Migration 014: Billing schema fixed successfully.';
GO
