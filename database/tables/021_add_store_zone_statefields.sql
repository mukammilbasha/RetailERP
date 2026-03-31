-- ============================================================
-- Migration 021: Add Zone, StateCode, ContactNo, Pincode to sales.Stores
-- ============================================================
USE RetailERP;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('sales.Stores') AND name = 'Zone'
)
BEGIN
    ALTER TABLE sales.Stores ADD Zone NVARCHAR(20) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('sales.Stores') AND name = 'StateCode'
)
BEGIN
    ALTER TABLE sales.Stores ADD StateCode NVARCHAR(5) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('sales.Stores') AND name = 'ContactNo'
)
BEGIN
    ALTER TABLE sales.Stores ADD ContactNo NVARCHAR(20) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('sales.Stores') AND name = 'Pincode'
)
BEGIN
    ALTER TABLE sales.Stores ADD Pincode NVARCHAR(10) NULL;
END
GO
