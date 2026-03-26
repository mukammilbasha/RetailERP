-- ============================================
-- Migration: Add CompanyName to TenantSettings
-- ============================================

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('auth.TenantSettings')
    AND name = 'CompanyName'
)
BEGIN
    ALTER TABLE auth.TenantSettings
    ADD CompanyName NVARCHAR(200) NULL;
    PRINT 'Column CompanyName added to auth.TenantSettings';
END
ELSE
BEGIN
    PRINT 'Column CompanyName already exists in auth.TenantSettings';
END
GO

-- Backfill CompanyName from Tenants table for existing rows
UPDATE ts
SET ts.CompanyName = t.CompanyName
FROM auth.TenantSettings ts
INNER JOIN auth.Tenants t ON ts.TenantId = t.TenantId
WHERE ts.CompanyName IS NULL;
GO

PRINT 'Migration 013_add_company_name completed.';
GO
