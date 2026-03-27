-- Add WarehouseType column to warehouse.Warehouses table
USE RetailERP;
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA='warehouse' AND TABLE_NAME='Warehouses' AND COLUMN_NAME='WarehouseType'
)
BEGIN
    ALTER TABLE warehouse.Warehouses ADD WarehouseType NVARCHAR(20) NOT NULL DEFAULT 'Main';
    PRINT 'Added WarehouseType column to warehouse.Warehouses';
END
ELSE
    PRINT 'WarehouseType column already exists';
GO
