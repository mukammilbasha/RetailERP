-- Migration 024: Seed Color Master (6 colors) and Warehouse Master (2 warehouses)
-- Idempotent — safe to re-run
-- Date: 2026-03-31

USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId UNIQUEIDENTIFIER;
SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode='ELCURIO';

IF @TenantId IS NULL BEGIN
    PRINT 'ERROR: Tenant ELCURIO not found. Run the master seed first.';
    RETURN;
END

DECLARE @AdminUserId UNIQUEIDENTIFIER;
SELECT @AdminUserId = UserId FROM auth.Users WHERE TenantId=@TenantId AND Email='admin@elcurio.com';

-- ── Seed Colors ─────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM master.Colors WHERE TenantId=@TenantId AND ColorName='BLACK')
    INSERT INTO master.Colors(ColorId,TenantId,ColorName,ColorCode,IsActive,CreatedAt)
    VALUES(NEWID(),@TenantId,'BLACK','BLK',1,SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM master.Colors WHERE TenantId=@TenantId AND ColorName='TAN')
    INSERT INTO master.Colors(ColorId,TenantId,ColorName,ColorCode,IsActive,CreatedAt)
    VALUES(NEWID(),@TenantId,'TAN','TAN',1,SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM master.Colors WHERE TenantId=@TenantId AND ColorName='WHITE')
    INSERT INTO master.Colors(ColorId,TenantId,ColorName,ColorCode,IsActive,CreatedAt)
    VALUES(NEWID(),@TenantId,'WHITE','WHT',1,SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM master.Colors WHERE TenantId=@TenantId AND ColorName='BROWN')
    INSERT INTO master.Colors(ColorId,TenantId,ColorName,ColorCode,IsActive,CreatedAt)
    VALUES(NEWID(),@TenantId,'BROWN','BRN',1,SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM master.Colors WHERE TenantId=@TenantId AND ColorName='BORDO')
    INSERT INTO master.Colors(ColorId,TenantId,ColorName,ColorCode,IsActive,CreatedAt)
    VALUES(NEWID(),@TenantId,'BORDO','BRD',1,SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM master.Colors WHERE TenantId=@TenantId AND ColorName='NAVY')
    INSERT INTO master.Colors(ColorId,TenantId,ColorName,ColorCode,IsActive,CreatedAt)
    VALUES(NEWID(),@TenantId,'NAVY','NVY',1,SYSUTCDATETIME());

-- ── Seed Warehouses ─────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM warehouse.Warehouses WHERE TenantId=@TenantId AND WarehouseCode='WH-001')
    INSERT INTO warehouse.Warehouses(WarehouseId,TenantId,WarehouseCode,WarehouseName,IsActive,CreatedAt,CreatedBy)
    VALUES(NEWID(),@TenantId,'WH-001','SIPCOT',1,SYSUTCDATETIME(),@AdminUserId);

IF NOT EXISTS (SELECT 1 FROM warehouse.Warehouses WHERE TenantId=@TenantId AND WarehouseCode='WH-002')
    INSERT INTO warehouse.Warehouses(WarehouseId,TenantId,WarehouseCode,WarehouseName,IsActive,CreatedAt,CreatedBy)
    VALUES(NEWID(),@TenantId,'WH-002','MANTANGHAL',1,SYSUTCDATETIME(),@AdminUserId);

PRINT 'Migration 024: Seeded 6 colors and 2 warehouses successfully.';
GO
