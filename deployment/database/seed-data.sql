-- ============================================================
-- RetailERP — Deployment Reference Data Seed
-- Run after schema creation for a fresh environment
-- Idempotent: uses MERGE / IF NOT EXISTS patterns
-- ============================================================

USE RetailERP;
GO

-- ── Roles ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM Roles WHERE Name = 'SuperAdmin')
BEGIN
    INSERT INTO Roles (Name, Description, IsActive, CreatedAt)
    VALUES ('SuperAdmin', 'Full system access', 1, GETUTCDATE());
END

IF NOT EXISTS (SELECT 1 FROM Roles WHERE Name = 'StoreManager')
BEGIN
    INSERT INTO Roles (Name, Description, IsActive, CreatedAt)
    VALUES ('StoreManager', 'Manage store operations, inventory, reports', 1, GETUTCDATE());
END

IF NOT EXISTS (SELECT 1 FROM Roles WHERE Name = 'Cashier')
BEGIN
    INSERT INTO Roles (Name, Description, IsActive, CreatedAt)
    VALUES ('Cashier', 'Process sales at POS terminal', 1, GETUTCDATE());
END

IF NOT EXISTS (SELECT 1 FROM Roles WHERE Name = 'WarehouseStaff')
BEGIN
    INSERT INTO Roles (Name, Description, IsActive, CreatedAt)
    VALUES ('WarehouseStaff', 'Manage inventory movements', 1, GETUTCDATE());
END
GO

-- ── Default admin user (password: Admin@1234 — CHANGE IN PROD) ─
IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@retailerp.local')
BEGIN
    DECLARE @RoleId INT = (SELECT TOP 1 Id FROM Roles WHERE Name = 'SuperAdmin');
    INSERT INTO Users (FirstName, LastName, Email, PasswordHash, RoleId, IsActive, CreatedAt)
    VALUES (
        'System', 'Administrator',
        'admin@retailerp.local',
        -- BCrypt hash of 'Admin@1234' — regenerate in production!
        '$2a$11$placeholder.hash.change.in.production.immediately',
        @RoleId, 1, GETUTCDATE()
    );
    PRINT 'Default admin user created: admin@retailerp.local';
END
GO

-- ── Currency settings ─────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM Currencies WHERE Code = 'USD')
BEGIN
    INSERT INTO Currencies (Code, Name, Symbol, IsDefault, IsActive)
    VALUES ('USD', 'US Dollar', '$', 1, 1);
END

IF NOT EXISTS (SELECT 1 FROM Currencies WHERE Code = 'EUR')
BEGIN
    INSERT INTO Currencies (Code, Name, Symbol, IsDefault, IsActive)
    VALUES ('EUR', 'Euro', '€', 0, 1);
END
GO

-- ── Tax categories ─────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM TaxCategories WHERE Name = 'Standard')
BEGIN
    INSERT INTO TaxCategories (Name, Rate, IsActive, CreatedAt)
    VALUES ('Standard', 10.00, 1, GETUTCDATE());
END

IF NOT EXISTS (SELECT 1 FROM TaxCategories WHERE Name = 'Reduced')
BEGIN
    INSERT INTO TaxCategories (Name, Rate, IsActive, CreatedAt)
    VALUES ('Reduced', 5.00, 1, GETUTCDATE());
END

IF NOT EXISTS (SELECT 1 FROM TaxCategories WHERE Name = 'Zero-Rated')
BEGIN
    INSERT INTO TaxCategories (Name, Rate, IsActive, CreatedAt)
    VALUES ('Zero-Rated', 0.00, 1, GETUTCDATE());
END
GO

-- ── Units of measure ──────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM UnitsOfMeasure WHERE Code = 'PCS')
BEGIN
    INSERT INTO UnitsOfMeasure (Code, Name, IsActive) VALUES ('PCS', 'Pieces', 1);
END
IF NOT EXISTS (SELECT 1 FROM UnitsOfMeasure WHERE Code = 'KG')
BEGIN
    INSERT INTO UnitsOfMeasure (Code, Name, IsActive) VALUES ('KG', 'Kilograms', 1);
END
IF NOT EXISTS (SELECT 1 FROM UnitsOfMeasure WHERE Code = 'LTR')
BEGIN
    INSERT INTO UnitsOfMeasure (Code, Name, IsActive) VALUES ('LTR', 'Litres', 1);
END
IF NOT EXISTS (SELECT 1 FROM UnitsOfMeasure WHERE Code = 'BOX')
BEGIN
    INSERT INTO UnitsOfMeasure (Code, Name, IsActive) VALUES ('BOX', 'Box', 1);
END
GO

-- ── Default warehouse ─────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM Warehouses WHERE Code = 'MAIN')
BEGIN
    INSERT INTO Warehouses (Code, Name, Address, IsActive, CreatedAt)
    VALUES ('MAIN', 'Main Warehouse', '123 Warehouse Street', 1, GETUTCDATE());
END
GO

-- ── Payment methods ───────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM PaymentMethods WHERE Code = 'CASH')
BEGIN
    INSERT INTO PaymentMethods (Code, Name, IsActive) VALUES ('CASH', 'Cash', 1);
END
IF NOT EXISTS (SELECT 1 FROM PaymentMethods WHERE Code = 'CARD')
BEGIN
    INSERT INTO PaymentMethods (Code, Name, IsActive) VALUES ('CARD', 'Credit/Debit Card', 1);
END
IF NOT EXISTS (SELECT 1 FROM PaymentMethods WHERE Code = 'EWALLET')
BEGIN
    INSERT INTO PaymentMethods (Code, Name, IsActive) VALUES ('EWALLET', 'E-Wallet', 1);
END
GO

-- ── POS terminal default ──────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM POSTerminals WHERE Code = 'POS-001')
BEGIN
    DECLARE @WarehouseId INT = (SELECT TOP 1 Id FROM Warehouses WHERE Code = 'MAIN');
    INSERT INTO POSTerminals (Code, Name, WarehouseId, IsActive, CreatedAt)
    VALUES ('POS-001', 'Main Counter Terminal', @WarehouseId, 1, GETUTCDATE());
    PRINT 'Default POS terminal created: POS-001';
END
GO

PRINT 'Seed data complete.';
GO
