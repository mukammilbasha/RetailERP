-- ============================================================
-- Migration 022: Add State (name) column to sales.Clients
-- The frontend sends the state name but the column was missing.
-- ============================================================
USE RetailERP;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('sales.Clients') AND name = 'State'
)
BEGIN
    ALTER TABLE sales.Clients ADD State NVARCHAR(100) NULL;
END
GO
