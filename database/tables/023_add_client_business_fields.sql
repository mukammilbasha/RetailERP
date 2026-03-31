-- ============================================================
-- Migration 023: Add BusinessChannel and BusinessModule to sales.Clients
-- ============================================================
USE RetailERP;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('sales.Clients') AND name = 'BusinessChannel'
)
BEGIN
    ALTER TABLE sales.Clients ADD BusinessChannel NVARCHAR(50) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('sales.Clients') AND name = 'BusinessModule'
)
BEGIN
    ALTER TABLE sales.Clients ADD BusinessModule NVARCHAR(50) NULL;
END
GO
