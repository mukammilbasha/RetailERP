-- RetailERP Database Schemas
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'auth') EXEC('CREATE SCHEMA auth');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'master') EXEC('CREATE SCHEMA [master]');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'product') EXEC('CREATE SCHEMA product');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'inventory') EXEC('CREATE SCHEMA inventory');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'production') EXEC('CREATE SCHEMA production');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'sales') EXEC('CREATE SCHEMA sales');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'billing') EXEC('CREATE SCHEMA billing');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'warehouse') EXEC('CREATE SCHEMA warehouse');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'audit') EXEC('CREATE SCHEMA audit');
GO
PRINT 'All schemas created';
