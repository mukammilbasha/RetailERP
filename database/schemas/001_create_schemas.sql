-- ============================================================
-- RetailERP - Database Schema Creation
-- EL CURIO Multi-Tenant Retail Distribution Platform
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'RetailERP')
    CREATE DATABASE RetailERP;
GO

USE RetailERP;
GO

-- Create schemas for logical separation
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'auth')
    EXEC('CREATE SCHEMA auth');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'master')
    EXEC('CREATE SCHEMA master');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'product')
    EXEC('CREATE SCHEMA product');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'inventory')
    EXEC('CREATE SCHEMA inventory');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'production')
    EXEC('CREATE SCHEMA production');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'sales')
    EXEC('CREATE SCHEMA sales');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'billing')
    EXEC('CREATE SCHEMA billing');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'warehouse')
    EXEC('CREATE SCHEMA warehouse');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'audit')
    EXEC('CREATE SCHEMA audit');
GO

PRINT 'Schemas created successfully.';
GO
