-- Fix unique constraints for soft-delete pattern in sales and warehouse schemas
-- Converts non-filtered UNIQUE constraints to filtered indexes WHERE IsActive = 1
USE RetailERP;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- sales.Clients: UQ_Clients_Code_Tenant
-- ============================================================
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Clients_Code_Tenant' AND parent_object_id = OBJECT_ID('sales.Clients'))
    ALTER TABLE sales.Clients DROP CONSTRAINT UQ_Clients_Code_Tenant;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Clients_Code_Tenant' AND object_id = OBJECT_ID('sales.Clients'))
    CREATE UNIQUE INDEX UQ_Clients_Code_Tenant ON sales.Clients(TenantId, ClientCode) WHERE IsActive = 1;
GO
PRINT 'Fixed UQ_Clients_Code_Tenant';
GO

-- ============================================================
-- sales.Stores: UQ_Stores_Code_Tenant
-- ============================================================
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Stores_Code_Tenant' AND parent_object_id = OBJECT_ID('sales.Stores'))
    ALTER TABLE sales.Stores DROP CONSTRAINT UQ_Stores_Code_Tenant;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Stores_Code_Tenant' AND object_id = OBJECT_ID('sales.Stores'))
    CREATE UNIQUE INDEX UQ_Stores_Code_Tenant ON sales.Stores(TenantId, StoreCode) WHERE IsActive = 1;
GO
PRINT 'Fixed UQ_Stores_Code_Tenant';
GO

-- ============================================================
-- warehouse.Warehouses: UQ_Warehouses_Code_Tenant
-- ============================================================
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Warehouses_Code_Tenant' AND parent_object_id = OBJECT_ID('warehouse.Warehouses'))
    ALTER TABLE warehouse.Warehouses DROP CONSTRAINT UQ_Warehouses_Code_Tenant;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Warehouses_Code_Tenant' AND object_id = OBJECT_ID('warehouse.Warehouses'))
    CREATE UNIQUE INDEX UQ_Warehouses_Code_Tenant ON warehouse.Warehouses(TenantId, WarehouseCode) WHERE IsActive = 1;
GO
PRINT 'Fixed UQ_Warehouses_Code_Tenant';
GO
