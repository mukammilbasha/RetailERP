-- ============================================================
-- RetailERP - Seed Data
-- ============================================================
USE RetailERP;
GO

-- Seed Permissions (modules)
INSERT INTO auth.Permissions (PermissionId, Module, CanView, CanAdd, CanEdit, CanDelete) VALUES
(NEWID(), 'Dashboard', 1, 0, 0, 0),
(NEWID(), 'Clients', 1, 1, 1, 1),
(NEWID(), 'Stores', 1, 1, 1, 1),
(NEWID(), 'Warehouses', 1, 1, 1, 1),
(NEWID(), 'Articles', 1, 1, 1, 1),
(NEWID(), 'MDA', 1, 1, 1, 1),
(NEWID(), 'Stock', 1, 1, 1, 1),
(NEWID(), 'Receipt', 1, 1, 1, 1),
(NEWID(), 'Dispatch', 1, 1, 1, 1),
(NEWID(), 'Returns', 1, 1, 1, 1),
(NEWID(), 'Analytics', 1, 0, 0, 0),
(NEWID(), 'Reports', 1, 0, 0, 0),
(NEWID(), 'Users', 1, 1, 1, 1),
(NEWID(), 'Roles', 1, 1, 1, 1),
(NEWID(), 'Audit', 1, 0, 0, 0),
(NEWID(), 'Brands', 1, 1, 1, 1),
(NEWID(), 'Genders', 1, 1, 1, 1),
(NEWID(), 'Seasons', 1, 1, 1, 1),
(NEWID(), 'Segments', 1, 1, 1, 1),
(NEWID(), 'Categories', 1, 1, 1, 1),
(NEWID(), 'Groups', 1, 1, 1, 1),
(NEWID(), 'Sizes', 1, 1, 1, 1),
(NEWID(), 'Production', 1, 1, 1, 1),
(NEWID(), 'Orders', 1, 1, 1, 1),
(NEWID(), 'Billing', 1, 1, 1, 1);
GO

-- Seed Indian States
INSERT INTO master.States (StateId, StateName, StateCode, Zone) VALUES
(1, 'Jammu & Kashmir', '01', 'NORTH'),
(2, 'Himachal Pradesh', '02', 'NORTH'),
(3, 'Punjab', '03', 'NORTH'),
(4, 'Chandigarh', '04', 'NORTH'),
(5, 'Uttarakhand', '05', 'NORTH'),
(6, 'Haryana', '06', 'NORTH'),
(7, 'Delhi', '07', 'NORTH'),
(8, 'Rajasthan', '08', 'WEST'),
(9, 'Uttar Pradesh', '09', 'NORTH'),
(10, 'Bihar', '10', 'EAST'),
(11, 'Sikkim', '11', 'EAST'),
(12, 'Arunachal Pradesh', '12', 'EAST'),
(13, 'Nagaland', '13', 'EAST'),
(14, 'Manipur', '14', 'EAST'),
(15, 'Mizoram', '15', 'EAST'),
(16, 'Tripura', '16', 'EAST'),
(17, 'Meghalaya', '17', 'EAST'),
(18, 'Assam', '18', 'EAST'),
(19, 'West Bengal', '19', 'EAST'),
(20, 'Jharkhand', '20', 'EAST'),
(21, 'Odisha', '21', 'EAST'),
(22, 'Chhattisgarh', '22', 'CENTRAL'),
(23, 'Madhya Pradesh', '23', 'CENTRAL'),
(24, 'Gujarat', '24', 'WEST'),
(26, 'Dadra & Nagar Haveli and Daman & Diu', '26', 'WEST'),
(27, 'Maharashtra', '27', 'WEST'),
(29, 'Karnataka', '29', 'SOUTH'),
(30, 'Goa', '30', 'WEST'),
(32, 'Kerala', '32', 'SOUTH'),
(33, 'Tamil Nadu', '33', 'SOUTH'),
(34, 'Puducherry', '34', 'SOUTH'),
(36, 'Telangana', '36', 'SOUTH'),
(37, 'Andhra Pradesh', '37', 'SOUTH');
GO

-- Seed HSN Codes for footwear and leather goods
INSERT INTO master.HSNCodes (HSNId, HSNCode, Description, GSTRate) VALUES
(NEWID(), '64039990', 'Footwear with outer soles of rubber/plastics, upper of leather', 18.00),
(NEWID(), '64041990', 'Footwear with outer soles of rubber/plastics, upper of textile', 18.00),
(NEWID(), '64029990', 'Other footwear with outer soles and uppers of rubber or plastics', 18.00),
(NEWID(), '42021290', 'Trunks, suit-cases, vanity-cases', 18.00),
(NEWID(), '42023290', 'Wallets, purses, key-pouches of leather', 18.00),
(NEWID(), '42033000', 'Belts and bandoliers of leather', 18.00),
(NEWID(), '42031000', 'Articles of apparel of leather', 18.00);
GO

-- Seed default tenant: EL CURIO
DECLARE @TenantId UNIQUEIDENTIFIER = NEWID();
INSERT INTO auth.Tenants (TenantId, TenantName, TenantCode, CompanyName, GSTIN, Address, City, State, PinCode, Phone, Email)
VALUES (@TenantId, 'EL CURIO', 'ELCURIO', 'EL CURIO Multi-Tenant Retail Distribution',
        '27AABCE1234F1Z5', 'Plot No. 17, Sector 5, Industrial Area', 'Bhiwandi, Mumbai', 'Maharashtra', '421302',
        '9876543210', 'info@elcurio.com');

-- Seed roles for EL CURIO
DECLARE @AdminRoleId UNIQUEIDENTIFIER = NEWID();
DECLARE @ManagerRoleId UNIQUEIDENTIFIER = NEWID();
DECLARE @WarehouseRoleId UNIQUEIDENTIFIER = NEWID();
DECLARE @AccountsRoleId UNIQUEIDENTIFIER = NEWID();
DECLARE @ViewerRoleId UNIQUEIDENTIFIER = NEWID();

INSERT INTO auth.Roles (RoleId, TenantId, RoleName, Description, IsSystem) VALUES
(@AdminRoleId, @TenantId, 'Admin', 'Full system access', 1),
(@ManagerRoleId, @TenantId, 'Storemanager', 'Store management access', 1),
(@WarehouseRoleId, @TenantId, 'Accountuser', 'Accounts and billing access', 1),
(@AccountsRoleId, @TenantId, 'Viewer', 'View-only access', 1);

-- Seed admin user (password: Admin@123 - bcrypt hashed)
INSERT INTO auth.Users (UserId, TenantId, FullName, Email, PasswordHash, RoleId, IsFirstLogin)
VALUES (NEWID(), @TenantId, 'Rajesh Kumar', 'admin@elcurio.com',
        '$2a$11$RZAU5ibXoHEkyx7BU3KqBumDLTMJ.EyYZ/BPGtybueSsczawrIyQW', @AdminRoleId, 0);
INSERT INTO auth.Users (UserId, TenantId, FullName, Email, PasswordHash, RoleId)
VALUES (NEWID(), @TenantId, 'Priya Sharma', 'warehouse@elcurio.com',
        '$2a$11$RZAU5ibXoHEkyx7BU3KqBumDLTMJ.EyYZ/BPGtybueSsczawrIyQW', @ManagerRoleId);
INSERT INTO auth.Users (UserId, TenantId, FullName, Email, PasswordHash, RoleId)
VALUES (NEWID(), @TenantId, 'Amit Patil', 'accounts@elcurio.com',
        '$2a$11$RZAU5ibXoHEkyx7BU3KqBumDLTMJ.EyYZ/BPGtybueSsczawrIyQW', @WarehouseRoleId);
INSERT INTO auth.Users (UserId, TenantId, FullName, Email, PasswordHash, RoleId)
VALUES (NEWID(), @TenantId, 'Sneha Gupti', 'viewer@elcurio.com',
        '$2a$11$RZAU5ibXoHEkyx7BU3KqBumDLTMJ.EyYZ/BPGtybueSsczawrIyQW', @AccountsRoleId);

-- Seed master data for EL CURIO
INSERT INTO master.Brands (BrandId, TenantId, BrandName) VALUES
(NEWID(), @TenantId, 'ClassicStep'),
(NEWID(), @TenantId, 'RunFast'),
(NEWID(), @TenantId, 'UrbanStep'),
(NEWID(), @TenantId, 'BagCraft'),
(NEWID(), @TenantId, 'TravelPro'),
(NEWID(), @TenantId, 'BeltKing');

INSERT INTO master.Genders (GenderId, TenantId, GenderName) VALUES
(NEWID(), @TenantId, 'Men'),
(NEWID(), @TenantId, 'Women'),
(NEWID(), @TenantId, 'Unisex');

INSERT INTO master.Seasons (SeasonId, TenantId, SeasonCode, StartDate, EndDate) VALUES
(NEWID(), @TenantId, 'SS24', '2024-03-01', '2024-08-31'),
(NEWID(), @TenantId, 'AW24', '2024-09-01', '2025-02-28'),
(NEWID(), @TenantId, 'SS25', '2025-03-01', '2025-08-31'),
(NEWID(), @TenantId, 'AW25', '2025-09-01', '2026-02-28');

INSERT INTO master.Segments (SegmentId, TenantId, SegmentName) VALUES
(NEWID(), @TenantId, 'Footwear'),
(NEWID(), @TenantId, 'Leather Goods');

INSERT INTO master.Categories (CategoryId, TenantId, CategoryName) VALUES
(NEWID(), @TenantId, 'Shoes'),
(NEWID(), @TenantId, 'Bags'),
(NEWID(), @TenantId, 'Belts');

INSERT INTO master.Groups (GroupId, TenantId, GroupName) VALUES
(NEWID(), @TenantId, 'Classic Collection'),
(NEWID(), @TenantId, 'Urban Collection'),
(NEWID(), @TenantId, 'Executive Collection'),
(NEWID(), @TenantId, 'Sport Collection');

-- Seed Warehouses
INSERT INTO warehouse.Warehouses (WarehouseId, TenantId, WarehouseCode, WarehouseName, City, State) VALUES
(NEWID(), @TenantId, 'WH-MH', 'Mumbai Central Warehouse', 'Mumbai', 'Maharashtra'),
(NEWID(), @TenantId, 'WH-DL', 'Delhi Distribution Center', 'Gurgaon', 'Haryana');

GO

PRINT 'Seed data inserted successfully.';
GO
