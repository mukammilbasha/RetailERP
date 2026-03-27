-- Migration 020: Add missing columns to sales.CustomerOrders
-- Missing: Channel, CancelledBy, CancelledAt, CancellationReason

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='sales' AND TABLE_NAME='CustomerOrders' AND COLUMN_NAME='Channel')
    ALTER TABLE sales.CustomerOrders ADD Channel NVARCHAR(50) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='sales' AND TABLE_NAME='CustomerOrders' AND COLUMN_NAME='CancelledBy')
    ALTER TABLE sales.CustomerOrders ADD CancelledBy UNIQUEIDENTIFIER NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='sales' AND TABLE_NAME='CustomerOrders' AND COLUMN_NAME='CancelledAt')
    ALTER TABLE sales.CustomerOrders ADD CancelledAt DATETIME2(7) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='sales' AND TABLE_NAME='CustomerOrders' AND COLUMN_NAME='CancellationReason')
    ALTER TABLE sales.CustomerOrders ADD CancellationReason NVARCHAR(500) NULL;

PRINT 'Migration 020 complete: Added Channel, CancelledBy, CancelledAt, CancellationReason to sales.CustomerOrders';
