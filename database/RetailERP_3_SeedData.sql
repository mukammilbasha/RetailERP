-- ============================================================
-- RetailERP - FILE 3 OF 3: Seed Data
-- EL CURIO Multi-Tenant Retail Distribution Platform
-- Idempotent: all inserts guarded with WHERE NOT EXISTS
-- Run AFTER File 1 and File 2
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- SECTION 1: PERMISSIONS (modules)
-- ============================================================
INSERT INTO auth.Permissions (PermissionId, Module, CanView, CanAdd, CanEdit, CanDelete)
SELECT s.PermissionId, s.Module, s.CanView, s.CanAdd, s.CanEdit, s.CanDelete
FROM (VALUES
    (NEWID(),'Dashboard',  1,0,0,0),
    (NEWID(),'Clients',    1,1,1,1),
    (NEWID(),'Stores',     1,1,1,1),
    (NEWID(),'Warehouses', 1,1,1,1),
    (NEWID(),'Articles',   1,1,1,1),
    (NEWID(),'MDA',        1,1,1,1),
    (NEWID(),'Stock',      1,1,1,1),
    (NEWID(),'Receipt',    1,1,1,1),
    (NEWID(),'Dispatch',   1,1,1,1),
    (NEWID(),'Returns',    1,1,1,1),
    (NEWID(),'Analytics',  1,0,0,0),
    (NEWID(),'Reports',    1,0,0,0),
    (NEWID(),'Users',      1,1,1,1),
    (NEWID(),'Roles',      1,1,1,1),
    (NEWID(),'Audit',      1,0,0,0),
    (NEWID(),'Brands',     1,1,1,1),
    (NEWID(),'Genders',    1,1,1,1),
    (NEWID(),'Seasons',    1,1,1,1),
    (NEWID(),'Segments',   1,1,1,1),
    (NEWID(),'Categories', 1,1,1,1),
    (NEWID(),'Groups',     1,1,1,1),
    (NEWID(),'Sizes',      1,1,1,1),
    (NEWID(),'Production', 1,1,1,1),
    (NEWID(),'Orders',     1,1,1,1),
    (NEWID(),'Billing',    1,1,1,1)
) AS s(PermissionId, Module, CanView, CanAdd, CanEdit, CanDelete)
WHERE NOT EXISTS (SELECT 1 FROM auth.Permissions p WHERE p.Module = s.Module);
GO

PRINT 'Section 1: Permissions seeded.';
GO

-- ============================================================
-- SECTION 2: INDIAN STATES
-- ============================================================
INSERT INTO master.States (StateId, StateName, StateCode, Zone)
SELECT s.StateId, s.StateName, s.StateCode, s.Zone FROM (VALUES
    (1, 'Jammu & Kashmir',                          '01','NORTH'),
    (2, 'Himachal Pradesh',                         '02','NORTH'),
    (3, 'Punjab',                                   '03','NORTH'),
    (4, 'Chandigarh',                               '04','NORTH'),
    (5, 'Uttarakhand',                              '05','NORTH'),
    (6, 'Haryana',                                  '06','NORTH'),
    (7, 'Delhi',                                    '07','NORTH'),
    (8, 'Rajasthan',                                '08','WEST'),
    (9, 'Uttar Pradesh',                            '09','NORTH'),
    (10,'Bihar',                                    '10','EAST'),
    (11,'Sikkim',                                   '11','EAST'),
    (12,'Arunachal Pradesh',                        '12','EAST'),
    (13,'Nagaland',                                 '13','EAST'),
    (14,'Manipur',                                  '14','EAST'),
    (15,'Mizoram',                                  '15','EAST'),
    (16,'Tripura',                                  '16','EAST'),
    (17,'Meghalaya',                                '17','EAST'),
    (18,'Assam',                                    '18','EAST'),
    (19,'West Bengal',                              '19','EAST'),
    (20,'Jharkhand',                                '20','EAST'),
    (21,'Odisha',                                   '21','EAST'),
    (22,'Chhattisgarh',                             '22','CENTRAL'),
    (23,'Madhya Pradesh',                           '23','CENTRAL'),
    (24,'Gujarat',                                  '24','WEST'),
    (26,'Dadra & Nagar Haveli and Daman & Diu',    '26','WEST'),
    (27,'Maharashtra',                              '27','WEST'),
    (29,'Karnataka',                                '29','SOUTH'),
    (30,'Goa',                                      '30','WEST'),
    (32,'Kerala',                                   '32','SOUTH'),
    (33,'Tamil Nadu',                               '33','SOUTH'),
    (34,'Puducherry',                               '34','SOUTH'),
    (36,'Telangana',                                '36','SOUTH'),
    (37,'Andhra Pradesh',                           '37','SOUTH')
) AS s(StateId, StateName, StateCode, Zone)
WHERE NOT EXISTS (SELECT 1 FROM master.States x WHERE x.StateId = s.StateId);
GO

PRINT 'Section 2: States seeded.';
GO

-- ============================================================
-- SECTION 3: HSN CODES
-- ============================================================
INSERT INTO master.HSNCodes (HSNId, HSNCode, Description, GSTRate)
SELECT s.HSNId, s.HSNCode, s.Description, s.GSTRate FROM (VALUES
    (NEWID(),'64039990','Footwear with outer soles of rubber/plastics, upper of leather',18.00),
    (NEWID(),'64041990','Footwear with outer soles of rubber/plastics, upper of textile',18.00),
    (NEWID(),'64029990','Other footwear with outer soles and uppers of rubber or plastics',18.00),
    (NEWID(),'42021290','Trunks, suit-cases, vanity-cases',18.00),
    (NEWID(),'42023290','Wallets, purses, key-pouches of leather',18.00),
    (NEWID(),'42033000','Belts and bandoliers of leather',18.00),
    (NEWID(),'42031000','Articles of apparel of leather',18.00)
) AS s(HSNId, HSNCode, Description, GSTRate)
WHERE NOT EXISTS (SELECT 1 FROM master.HSNCodes x WHERE x.HSNCode = s.HSNCode);
GO

PRINT 'Section 3: HSN Codes seeded.';
GO

-- ============================================================
-- SECTION 4: TENANT, ROLES, USERS, WAREHOUSES
-- ============================================================
DECLARE @TenantId        UNIQUEIDENTIFIER;
DECLARE @AdminRoleId     UNIQUEIDENTIFIER;
DECLARE @ManagerRoleId   UNIQUEIDENTIFIER;
DECLARE @AccountsRoleId  UNIQUEIDENTIFIER;
DECLARE @ViewerRoleId    UNIQUEIDENTIFIER;

-- Tenant
IF NOT EXISTS (SELECT 1 FROM auth.Tenants WHERE TenantCode = 'ELCURIO')
BEGIN
    SET @TenantId = NEWID();
    INSERT INTO auth.Tenants (TenantId, TenantName, TenantCode, CompanyName, GSTIN, Address, City, State, PinCode, Phone, Email)
    VALUES (@TenantId, 'EL CURIO', 'ELCURIO', 'EL CURIO Multi-Tenant Retail Distribution',
            '27AABCE1234F1Z5', 'Plot No. 17, Sector 5, Industrial Area', 'Bhiwandi, Mumbai', 'Maharashtra',
            '421302', '9876543210', 'info@elcurio.com');
END
ELSE
    SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';

-- Roles
IF NOT EXISTS (SELECT 1 FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Admin')
BEGIN
    SET @AdminRoleId = NEWID();
    INSERT INTO auth.Roles (RoleId, TenantId, RoleName, Description, IsSystem)
    VALUES (@AdminRoleId, @TenantId, 'Admin', 'Full system access', 1);
END
ELSE SELECT @AdminRoleId = RoleId FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Admin';

IF NOT EXISTS (SELECT 1 FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Storemanager')
BEGIN
    SET @ManagerRoleId = NEWID();
    INSERT INTO auth.Roles (RoleId, TenantId, RoleName, Description, IsSystem)
    VALUES (@ManagerRoleId, @TenantId, 'Storemanager', 'Store management access', 1);
END
ELSE SELECT @ManagerRoleId = RoleId FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Storemanager';

IF NOT EXISTS (SELECT 1 FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Accountuser')
BEGIN
    SET @AccountsRoleId = NEWID();
    INSERT INTO auth.Roles (RoleId, TenantId, RoleName, Description, IsSystem)
    VALUES (@AccountsRoleId, @TenantId, 'Accountuser', 'Accounts and billing access', 1);
END
ELSE SELECT @AccountsRoleId = RoleId FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Accountuser';

IF NOT EXISTS (SELECT 1 FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Viewer')
BEGIN
    SET @ViewerRoleId = NEWID();
    INSERT INTO auth.Roles (RoleId, TenantId, RoleName, Description, IsSystem)
    VALUES (@ViewerRoleId, @TenantId, 'Viewer', 'View-only access', 1);
END
ELSE SELECT @ViewerRoleId = RoleId FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Viewer';

-- Users (password: Admin@123 bcrypt hash)
IF NOT EXISTS (SELECT 1 FROM auth.Users WHERE TenantId = @TenantId AND Email = 'admin@elcurio.com')
    INSERT INTO auth.Users (UserId, TenantId, FullName, Email, PasswordHash, RoleId, IsFirstLogin)
    VALUES (NEWID(), @TenantId, 'Rajesh Kumar', 'admin@elcurio.com',
            '$2a$11$RZAU5ibXoHEkyx7BU3KqBumDLTMJ.EyYZ/BPGtybueSsczawrIyQW', @AdminRoleId, 0);

IF NOT EXISTS (SELECT 1 FROM auth.Users WHERE TenantId = @TenantId AND Email = 'warehouse@elcurio.com')
    INSERT INTO auth.Users (UserId, TenantId, FullName, Email, PasswordHash, RoleId)
    VALUES (NEWID(), @TenantId, 'Priya Sharma', 'warehouse@elcurio.com',
            '$2a$11$RZAU5ibXoHEkyx7BU3KqBumDLTMJ.EyYZ/BPGtybueSsczawrIyQW', @ManagerRoleId);

IF NOT EXISTS (SELECT 1 FROM auth.Users WHERE TenantId = @TenantId AND Email = 'accounts@elcurio.com')
    INSERT INTO auth.Users (UserId, TenantId, FullName, Email, PasswordHash, RoleId)
    VALUES (NEWID(), @TenantId, 'Amit Patil', 'accounts@elcurio.com',
            '$2a$11$RZAU5ibXoHEkyx7BU3KqBumDLTMJ.EyYZ/BPGtybueSsczawrIyQW', @AccountsRoleId);

IF NOT EXISTS (SELECT 1 FROM auth.Users WHERE TenantId = @TenantId AND Email = 'viewer@elcurio.com')
    INSERT INTO auth.Users (UserId, TenantId, FullName, Email, PasswordHash, RoleId)
    VALUES (NEWID(), @TenantId, 'Sneha Gupta', 'viewer@elcurio.com',
            '$2a$11$RZAU5ibXoHEkyx7BU3KqBumDLTMJ.EyYZ/BPGtybueSsczawrIyQW', @ViewerRoleId);

-- Warehouses
IF NOT EXISTS (SELECT 1 FROM warehouse.Warehouses WHERE TenantId = @TenantId AND WarehouseCode = 'WH-MH')
    INSERT INTO warehouse.Warehouses (WarehouseId, TenantId, WarehouseCode, WarehouseName, WarehouseType, City, State)
    VALUES (NEWID(), @TenantId, 'WH-MH', 'Mumbai Central Warehouse', 'Main', 'Mumbai', 'Maharashtra');

IF NOT EXISTS (SELECT 1 FROM warehouse.Warehouses WHERE TenantId = @TenantId AND WarehouseCode = 'WH-DL')
    INSERT INTO warehouse.Warehouses (WarehouseId, TenantId, WarehouseCode, WarehouseName, WarehouseType, City, State)
    VALUES (NEWID(), @TenantId, 'WH-DL', 'Delhi Distribution Center', 'Main', 'Gurgaon', 'Haryana');

-- TenantSettings
IF NOT EXISTS (SELECT 1 FROM auth.TenantSettings WHERE TenantId = @TenantId)
    INSERT INTO auth.TenantSettings (
        TenantId, CompanyName, TradeName, Subtitle, GSTIN, AddressLine1, City, State, Pincode,
        Phone, Email, BankAccountName, BankName, BankBranch, BankAccountNo, BankIFSCode,
        InvoicePrefix, InvoiceFormat, TermsAndConditions, Declaration, AuthorisedSignatory)
    VALUES (
        @TenantId, 'EL CURIO', 'SKH EXPORTS', 'Multi-Tenant Retail Distribution', '27AABCE1234F1Z5',
        'Plot No. 17, Sector 5, Industrial Area, Bhiwandi', 'Mumbai', 'Maharashtra', '421302',
        '9876543210', 'info@elcurio.com',
        'UNICO CREATIONS', 'HDFC BANK', 'RANIPET', '50200073196749', 'HDFC0001295',
        'SKH', 'SKH/{SEQ}/{FY}',
        'GOODS ONCE SOLD WILL NOT BE TAKEN BACK. PAYMENTS HAS TO BE MADE WITHIN THE STIPULATED TIME. SUBJECT TO CHENNAI JURISDICTION.',
        'We declare that this Invoice shows the actual prices of the goods and all the particulars are true and correct. All disputes are subject to Chennai jurisdiction only.',
        'Authorised Signatory');

-- License
IF NOT EXISTS (SELECT 1 FROM auth.Licenses WHERE TenantId = @TenantId)
    INSERT INTO auth.Licenses (TenantId, LicenseKey, PlanName, Status, MaxUsers, ValidFrom, ValidUntil, ModulesEnabled)
    VALUES (@TenantId, 'ELCU-RTRP-2024-ENTP', 'Enterprise', 'Active', 100, '2024-01-01', '2027-12-31',
            '["Masters","Inventory","Orders","Production","Billing","Reports","Admin","Warehouse"]');

PRINT 'Section 4: Tenant, Roles, Users, Warehouses, Settings, License seeded.';
GO

-- ============================================================
-- SECTION 5: ROLE PERMISSIONS
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId       UNIQUEIDENTIFIER; SELECT @TenantId       = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';
DECLARE @AdminRoleId    UNIQUEIDENTIFIER; SELECT @AdminRoleId    = RoleId   FROM auth.Roles   WHERE TenantId = @TenantId AND RoleName = 'Admin';
DECLARE @ManagerRoleId  UNIQUEIDENTIFIER; SELECT @ManagerRoleId  = RoleId   FROM auth.Roles   WHERE TenantId = @TenantId AND RoleName = 'Storemanager';
DECLARE @AccountsRoleId UNIQUEIDENTIFIER; SELECT @AccountsRoleId = RoleId   FROM auth.Roles   WHERE TenantId = @TenantId AND RoleName = 'Accountuser';
DECLARE @ViewerRoleId   UNIQUEIDENTIFIER; SELECT @ViewerRoleId   = RoleId   FROM auth.Roles   WHERE TenantId = @TenantId AND RoleName = 'Viewer';

-- Admin: full access
INSERT INTO auth.RolePermissions (RoleId, PermissionId, CanView, CanAdd, CanEdit, CanDelete)
SELECT @AdminRoleId, PermissionId, 1, 1, 1, 1 FROM auth.Permissions
WHERE NOT EXISTS (SELECT 1 FROM auth.RolePermissions rp WHERE rp.RoleId = @AdminRoleId AND rp.PermissionId = auth.Permissions.PermissionId);

-- Storemanager: full except Users/Roles/Audit (view-only) and no delete on Billing
INSERT INTO auth.RolePermissions (RoleId, PermissionId, CanView, CanAdd, CanEdit, CanDelete)
SELECT @ManagerRoleId, p.PermissionId, 1,
    CASE WHEN p.Module IN ('Users','Roles','Audit') THEN 0 ELSE 1 END,
    CASE WHEN p.Module IN ('Users','Roles','Audit') THEN 0 ELSE 1 END,
    CASE WHEN p.Module IN ('Users','Roles','Audit','Billing') THEN 0 ELSE 1 END
FROM auth.Permissions p
WHERE NOT EXISTS (SELECT 1 FROM auth.RolePermissions rp WHERE rp.RoleId = @ManagerRoleId AND rp.PermissionId = p.PermissionId);

-- Accountuser: Billing/Orders full; Inventory view+add; rest view
INSERT INTO auth.RolePermissions (RoleId, PermissionId, CanView, CanAdd, CanEdit, CanDelete)
SELECT @AccountsRoleId, p.PermissionId, 1,
    CASE WHEN p.Module IN ('Billing','Orders','Clients','Stores','Receipt','Dispatch','Returns','Reports','Analytics') THEN 1 ELSE 0 END,
    CASE WHEN p.Module IN ('Billing','Orders','Clients','Stores','Receipt','Dispatch','Returns') THEN 1 ELSE 0 END,
    CASE WHEN p.Module IN ('Billing','Orders') THEN 1 ELSE 0 END
FROM auth.Permissions p
WHERE NOT EXISTS (SELECT 1 FROM auth.RolePermissions rp WHERE rp.RoleId = @AccountsRoleId AND rp.PermissionId = p.PermissionId);

-- Viewer: view only
INSERT INTO auth.RolePermissions (RoleId, PermissionId, CanView, CanAdd, CanEdit, CanDelete)
SELECT @ViewerRoleId, PermissionId, 1, 0, 0, 0 FROM auth.Permissions
WHERE NOT EXISTS (SELECT 1 FROM auth.RolePermissions rp WHERE rp.RoleId = @ViewerRoleId AND rp.PermissionId = auth.Permissions.PermissionId);

PRINT 'Section 5: RolePermissions seeded.';
GO

-- ============================================================
-- SECTION 6: MASTER DATA (Brands, Genders, Seasons, Segments, Categories, Groups)
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId UNIQUEIDENTIFIER; SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';

-- Brands
INSERT INTO master.Brands (BrandId, TenantId, BrandName)
SELECT s.BrandId, @TenantId, s.BrandName FROM (VALUES
    (NEWID(),'ClassicStep'),(NEWID(),'RunFast'),(NEWID(),'UrbanStep'),
    (NEWID(),'BagCraft'),(NEWID(),'TravelPro'),(NEWID(),'BeltKing')
) AS s(BrandId, BrandName)
WHERE NOT EXISTS (SELECT 1 FROM master.Brands x WHERE x.TenantId = @TenantId AND x.BrandName = s.BrandName);

-- Genders
INSERT INTO master.Genders (GenderId, TenantId, GenderName)
SELECT s.GenderId, @TenantId, s.GenderName FROM (VALUES
    (NEWID(),'Men'),(NEWID(),'Women'),(NEWID(),'Unisex')
) AS s(GenderId, GenderName)
WHERE NOT EXISTS (SELECT 1 FROM master.Genders x WHERE x.TenantId = @TenantId AND x.GenderName = s.GenderName);

-- Seasons
INSERT INTO master.Seasons (SeasonId, TenantId, SeasonCode, StartDate, EndDate)
SELECT s.SeasonId, @TenantId, s.SeasonCode, s.StartDate, s.EndDate FROM (VALUES
    (NEWID(),'SS24','2024-03-01','2024-08-31'),
    (NEWID(),'AW24','2024-09-01','2025-02-28'),
    (NEWID(),'SS25','2025-03-01','2025-08-31'),
    (NEWID(),'AW25','2025-09-01','2026-02-28')
) AS s(SeasonId, SeasonCode, StartDate, EndDate)
WHERE NOT EXISTS (SELECT 1 FROM master.Seasons x WHERE x.TenantId = @TenantId AND x.SeasonCode = s.SeasonCode);

-- Segments
INSERT INTO master.Segments (SegmentId, TenantId, SegmentName)
SELECT s.SegmentId, @TenantId, s.SegmentName FROM (VALUES
    (NEWID(),'Footwear'),(NEWID(),'Leather Goods')
) AS s(SegmentId, SegmentName)
WHERE NOT EXISTS (SELECT 1 FROM master.Segments x WHERE x.TenantId = @TenantId AND x.SegmentName = s.SegmentName);

-- Categories
INSERT INTO master.Categories (CategoryId, TenantId, CategoryName)
SELECT s.CategoryId, @TenantId, s.CategoryName FROM (VALUES
    (NEWID(),'Shoes'),(NEWID(),'Bags'),(NEWID(),'Belts')
) AS s(CategoryId, CategoryName)
WHERE NOT EXISTS (SELECT 1 FROM master.Categories x WHERE x.TenantId = @TenantId AND x.CategoryName = s.CategoryName);

-- Groups
INSERT INTO master.Groups (GroupId, TenantId, GroupName)
SELECT s.GroupId, @TenantId, s.GroupName FROM (VALUES
    (NEWID(),'Classic Collection'),(NEWID(),'Urban Collection'),
    (NEWID(),'Executive Collection'),(NEWID(),'Sport Collection')
) AS s(GroupId, GroupName)
WHERE NOT EXISTS (SELECT 1 FROM master.Groups x WHERE x.TenantId = @TenantId AND x.GroupName = s.GroupName);

PRINT 'Section 6: Master data (Brands, Genders, Seasons, Segments, Categories, Groups) seeded.';
GO

-- ============================================================
-- SECTION 7: SUB-SEGMENTS, SUB-CATEGORIES, COLORS, STYLES, FASTENERS
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId      UNIQUEIDENTIFIER; SELECT @TenantId      = TenantId   FROM auth.Tenants    WHERE TenantCode = 'ELCURIO';
DECLARE @SegFootwearId UNIQUEIDENTIFIER; SELECT @SegFootwearId = SegmentId  FROM master.Segments  WHERE TenantId = @TenantId AND SegmentName = 'Footwear';
DECLARE @SegLeatherId  UNIQUEIDENTIFIER; SELECT @SegLeatherId  = SegmentId  FROM master.Segments  WHERE TenantId = @TenantId AND SegmentName = 'Leather Goods';
DECLARE @CatShoesId    UNIQUEIDENTIFIER; SELECT @CatShoesId    = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Shoes';
DECLARE @CatBagsId     UNIQUEIDENTIFIER; SELECT @CatBagsId     = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Bags';
DECLARE @CatBeltsId    UNIQUEIDENTIFIER; SELECT @CatBeltsId    = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Belts';

-- SubSegments
INSERT INTO master.SubSegments (TenantId, SegmentId, SubSegmentName)
SELECT s.TenantId, s.SegmentId, s.SubSegmentName FROM (VALUES
    (@TenantId,@SegFootwearId,'Formal'),
    (@TenantId,@SegFootwearId,'Casual'),
    (@TenantId,@SegFootwearId,'Sports'),
    (@TenantId,@SegFootwearId,'Ethnic'),
    (@TenantId,@SegLeatherId, 'Handbags'),
    (@TenantId,@SegLeatherId, 'Wallets'),
    (@TenantId,@SegLeatherId, 'Accessories')
) AS s(TenantId, SegmentId, SubSegmentName)
WHERE NOT EXISTS (SELECT 1 FROM master.SubSegments x WHERE x.SegmentId = s.SegmentId AND x.SubSegmentName = s.SubSegmentName);

-- SubCategories
INSERT INTO master.SubCategories (TenantId, CategoryId, SubCategoryName)
SELECT s.TenantId, s.CategoryId, s.SubCategoryName FROM (VALUES
    (@TenantId,@CatShoesId,'Derby'),(@TenantId,@CatShoesId,'Oxford'),
    (@TenantId,@CatShoesId,'Loafer'),(@TenantId,@CatShoesId,'Sneaker'),
    (@TenantId,@CatShoesId,'Sandal'),(@TenantId,@CatShoesId,'Boot'),
    (@TenantId,@CatBagsId, 'Tote'),(@TenantId,@CatBagsId,'Clutch'),
    (@TenantId,@CatBagsId, 'Backpack'),(@TenantId,@CatBagsId,'Briefcase'),
    (@TenantId,@CatBeltsId,'Formal Belt'),(@TenantId,@CatBeltsId,'Casual Belt')
) AS s(TenantId, CategoryId, SubCategoryName)
WHERE NOT EXISTS (SELECT 1 FROM master.SubCategories x WHERE x.CategoryId = s.CategoryId AND x.SubCategoryName = s.SubCategoryName);

-- Colors
INSERT INTO master.Colors (TenantId, ColorName, ColorCode)
SELECT s.TenantId, s.ColorName, s.ColorCode FROM (VALUES
    (@TenantId,'Black','#000000'),(@TenantId,'Brown','#7B3F00'),(@TenantId,'Tan','#D2B48C'),
    (@TenantId,'Navy','#001F5B'),(@TenantId,'White','#FFFFFF'),(@TenantId,'Grey','#808080'),
    (@TenantId,'Burgundy','#800020'),(@TenantId,'Cognac','#9A4722'),(@TenantId,'Olive','#556B2F')
) AS s(TenantId, ColorName, ColorCode)
WHERE NOT EXISTS (SELECT 1 FROM master.Colors x WHERE x.TenantId = s.TenantId AND x.ColorName = s.ColorName);

-- Styles
INSERT INTO master.Styles (TenantId, StyleName)
SELECT s.TenantId, s.StyleName FROM (VALUES
    (@TenantId,'Formal'),(@TenantId,'Casual'),(@TenantId,'Semi-Formal'),
    (@TenantId,'Sports'),(@TenantId,'Ethnic')
) AS s(TenantId, StyleName)
WHERE NOT EXISTS (SELECT 1 FROM master.Styles x WHERE x.TenantId = s.TenantId AND x.StyleName = s.StyleName);

-- Fasteners
INSERT INTO master.Fasteners (TenantId, FastenerName)
SELECT s.TenantId, s.FastenerName FROM (VALUES
    (@TenantId,'Lace-Up'),(@TenantId,'Slip-On'),(@TenantId,'Velcro'),
    (@TenantId,'Buckle'),(@TenantId,'Zip'),(@TenantId,'Chelsea'),(@TenantId,'Hook & Loop')
) AS s(TenantId, FastenerName)
WHERE NOT EXISTS (SELECT 1 FROM master.Fasteners x WHERE x.TenantId = s.TenantId AND x.FastenerName = s.FastenerName);

PRINT 'Section 7: SubSegments, SubCategories, Colors, Styles, Fasteners seeded.';
GO

-- ============================================================
-- SECTION 8: SIZE CHARTS
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId      UNIQUEIDENTIFIER; SELECT @TenantId      = TenantId FROM auth.Tenants  WHERE TenantCode = 'ELCURIO';
DECLARE @GenderMenId   UNIQUEIDENTIFIER; SELECT @GenderMenId   = GenderId FROM master.Genders WHERE TenantId = @TenantId AND GenderName = 'Men';
DECLARE @GenderWomenId UNIQUEIDENTIFIER; SELECT @GenderWomenId = GenderId FROM master.Genders WHERE TenantId = @TenantId AND GenderName = 'Women';

-- Men EUR 39-46
INSERT INTO master.SizeCharts (TenantId, ChartType, GenderId, AgeGroup, USSize, EuroSize, UKSize, IndSize, CM)
SELECT s.TenantId, s.ChartType, s.GenderId, s.AgeGroup, s.USSize, s.EuroSize, s.UKSize, s.IndSize, s.CM
FROM (VALUES
    (@TenantId,'Footwear',@GenderMenId,'Adult', 6.5, 39, 6.0,  6.0, 24.8),
    (@TenantId,'Footwear',@GenderMenId,'Adult', 7.0, 40, 6.5,  6.5, 25.4),
    (@TenantId,'Footwear',@GenderMenId,'Adult', 7.5, 41, 7.0,  7.0, 26.0),
    (@TenantId,'Footwear',@GenderMenId,'Adult', 8.0, 42, 7.5,  7.5, 26.7),
    (@TenantId,'Footwear',@GenderMenId,'Adult', 8.5, 43, 8.0,  8.0, 27.3),
    (@TenantId,'Footwear',@GenderMenId,'Adult', 9.5, 44, 9.0,  9.0, 28.0),
    (@TenantId,'Footwear',@GenderMenId,'Adult',10.5, 45,10.0, 10.0, 28.6),
    (@TenantId,'Footwear',@GenderMenId,'Adult',11.5, 46,11.0, 11.0, 29.2)
) AS s(TenantId,ChartType,GenderId,AgeGroup,USSize,EuroSize,UKSize,IndSize,CM)
WHERE NOT EXISTS (SELECT 1 FROM master.SizeCharts x
    WHERE x.TenantId = s.TenantId AND x.GenderId = s.GenderId AND x.EuroSize = s.EuroSize AND x.ChartType = s.ChartType);

-- Women EUR 35-41
INSERT INTO master.SizeCharts (TenantId, ChartType, GenderId, AgeGroup, USSize, EuroSize, UKSize, IndSize, CM)
SELECT s.TenantId, s.ChartType, s.GenderId, s.AgeGroup, s.USSize, s.EuroSize, s.UKSize, s.IndSize, s.CM
FROM (VALUES
    (@TenantId,'Footwear',@GenderWomenId,'Adult', 5.0, 35, 2.5, 2.5, 22.5),
    (@TenantId,'Footwear',@GenderWomenId,'Adult', 5.5, 36, 3.0, 3.0, 23.0),
    (@TenantId,'Footwear',@GenderWomenId,'Adult', 6.0, 37, 4.0, 4.0, 23.8),
    (@TenantId,'Footwear',@GenderWomenId,'Adult', 6.5, 38, 4.5, 4.5, 24.1),
    (@TenantId,'Footwear',@GenderWomenId,'Adult', 7.5, 39, 5.5, 5.5, 25.0),
    (@TenantId,'Footwear',@GenderWomenId,'Adult', 8.5, 40, 6.5, 6.5, 25.7),
    (@TenantId,'Footwear',@GenderWomenId,'Adult', 9.5, 41, 7.5, 7.5, 26.2)
) AS s(TenantId,ChartType,GenderId,AgeGroup,USSize,EuroSize,UKSize,IndSize,CM)
WHERE NOT EXISTS (SELECT 1 FROM master.SizeCharts x
    WHERE x.TenantId = s.TenantId AND x.GenderId = s.GenderId AND x.EuroSize = s.EuroSize AND x.ChartType = s.ChartType);

PRINT 'Section 8: SizeCharts seeded.';
GO

-- ============================================================
-- SECTION 9: ARTICLES + FOOTWEAR/LEATHER DETAILS + ARTICLE SIZES
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId       UNIQUEIDENTIFIER; SELECT @TenantId       = TenantId   FROM auth.Tenants    WHERE TenantCode = 'ELCURIO';
DECLARE @BrandCS UNIQUEIDENTIFIER; SELECT @BrandCS = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'ClassicStep';
DECLARE @BrandRF UNIQUEIDENTIFIER; SELECT @BrandRF = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'RunFast';
DECLARE @BrandUS UNIQUEIDENTIFIER; SELECT @BrandUS = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'UrbanStep';
DECLARE @BrandBC UNIQUEIDENTIFIER; SELECT @BrandBC = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'BagCraft';
DECLARE @BrandBK UNIQUEIDENTIFIER; SELECT @BrandBK = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'BeltKing';
DECLARE @SegFW   UNIQUEIDENTIFIER; SELECT @SegFW   = SegmentId  FROM master.Segments   WHERE TenantId = @TenantId AND SegmentName = 'Footwear';
DECLARE @SegLG   UNIQUEIDENTIFIER; SELECT @SegLG   = SegmentId  FROM master.Segments   WHERE TenantId = @TenantId AND SegmentName = 'Leather Goods';
DECLARE @CatSh   UNIQUEIDENTIFIER; SELECT @CatSh   = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Shoes';
DECLARE @CatBg   UNIQUEIDENTIFIER; SELECT @CatBg   = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Bags';
DECLARE @CatBlt  UNIQUEIDENTIFIER; SELECT @CatBlt  = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Belts';
DECLARE @GrpCL   UNIQUEIDENTIFIER; SELECT @GrpCL   = GroupId    FROM master.Groups     WHERE TenantId = @TenantId AND GroupName = 'Classic Collection';
DECLARE @GrpUB   UNIQUEIDENTIFIER; SELECT @GrpUB   = GroupId    FROM master.Groups     WHERE TenantId = @TenantId AND GroupName = 'Urban Collection';
DECLARE @GrpEX   UNIQUEIDENTIFIER; SELECT @GrpEX   = GroupId    FROM master.Groups     WHERE TenantId = @TenantId AND GroupName = 'Executive Collection';
DECLARE @GrpSP   UNIQUEIDENTIFIER; SELECT @GrpSP   = GroupId    FROM master.Groups     WHERE TenantId = @TenantId AND GroupName = 'Sport Collection';
DECLARE @GenM    UNIQUEIDENTIFIER; SELECT @GenM    = GenderId   FROM master.Genders    WHERE TenantId = @TenantId AND GenderName = 'Men';
DECLARE @GenW    UNIQUEIDENTIFIER; SELECT @GenW    = GenderId   FROM master.Genders    WHERE TenantId = @TenantId AND GenderName = 'Women';
DECLARE @GenU    UNIQUEIDENTIFIER; SELECT @GenU    = GenderId   FROM master.Genders    WHERE TenantId = @TenantId AND GenderName = 'Unisex';
DECLARE @SeaAW25 UNIQUEIDENTIFIER; SELECT @SeaAW25 = SeasonId   FROM master.Seasons    WHERE TenantId = @TenantId AND SeasonCode = 'AW25';
DECLARE @SeaSS25 UNIQUEIDENTIFIER; SELECT @SeaSS25 = SeasonId   FROM master.Seasons    WHERE TenantId = @TenantId AND SeasonCode = 'SS25';
DECLARE @SubCatDerby     UNIQUEIDENTIFIER; SELECT @SubCatDerby     = SubCategoryId FROM master.SubCategories WHERE CategoryId = @CatSh  AND SubCategoryName = 'Derby';
DECLARE @SubCatOxford    UNIQUEIDENTIFIER; SELECT @SubCatOxford    = SubCategoryId FROM master.SubCategories WHERE CategoryId = @CatSh  AND SubCategoryName = 'Oxford';
DECLARE @SubCatLoafer    UNIQUEIDENTIFIER; SELECT @SubCatLoafer    = SubCategoryId FROM master.SubCategories WHERE CategoryId = @CatSh  AND SubCategoryName = 'Loafer';
DECLARE @SubCatSneaker   UNIQUEIDENTIFIER; SELECT @SubCatSneaker   = SubCategoryId FROM master.SubCategories WHERE CategoryId = @CatSh  AND SubCategoryName = 'Sneaker';
DECLARE @SubCatTote      UNIQUEIDENTIFIER; SELECT @SubCatTote      = SubCategoryId FROM master.SubCategories WHERE CategoryId = @CatBg  AND SubCategoryName = 'Tote';
DECLARE @SubCatBriefcase UNIQUEIDENTIFIER; SELECT @SubCatBriefcase = SubCategoryId FROM master.SubCategories WHERE CategoryId = @CatBg  AND SubCategoryName = 'Briefcase';
DECLARE @SubCatFBelt     UNIQUEIDENTIFIER; SELECT @SubCatFBelt     = SubCategoryId FROM master.SubCategories WHERE CategoryId = @CatBlt AND SubCategoryName = 'Formal Belt';
DECLARE @SubSegFormal    UNIQUEIDENTIFIER; SELECT @SubSegFormal    = SubSegmentId  FROM master.SubSegments   WHERE SegmentId = @SegFW AND SubSegmentName = 'Formal';
DECLARE @SubSegCasual    UNIQUEIDENTIFIER; SELECT @SubSegCasual    = SubSegmentId  FROM master.SubSegments   WHERE SegmentId = @SegFW AND SubSegmentName = 'Casual';
DECLARE @SubSegSports    UNIQUEIDENTIFIER; SELECT @SubSegSports    = SubSegmentId  FROM master.SubSegments   WHERE SegmentId = @SegFW AND SubSegmentName = 'Sports';
DECLARE @SubSegHandbags  UNIQUEIDENTIFIER; SELECT @SubSegHandbags  = SubSegmentId  FROM master.SubSegments   WHERE SegmentId = @SegLG AND SubSegmentName = 'Handbags';
DECLARE @SubSegAccessory UNIQUEIDENTIFIER; SELECT @SubSegAccessory = SubSegmentId  FROM master.SubSegments   WHERE SegmentId = @SegLG AND SubSegmentName = 'Accessories';

-- Articles
IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-001')
    INSERT INTO product.Articles (TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
    VALUES (@TenantId,'CS-DRB-001','ClassicStep Executive Derby - Black',@BrandCS,@SegFW,@SubSegFormal,@CatSh,@SubCatDerby,@GrpEX,@SeaAW25,@GenM,'Black','Formal','Lace-Up','64039990','PAIRS',3995.00,2200.00,1,'2025-09-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-002')
    INSERT INTO product.Articles (TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
    VALUES (@TenantId,'CS-DRB-002','ClassicStep Executive Derby - Brown',@BrandCS,@SegFW,@SubSegFormal,@CatSh,@SubCatDerby,@GrpEX,@SeaAW25,@GenM,'Brown','Formal','Lace-Up','64039990','PAIRS',3995.00,2200.00,1,'2025-09-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-OXF-001')
    INSERT INTO product.Articles (TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
    VALUES (@TenantId,'CS-OXF-001','ClassicStep Classic Oxford - Black',@BrandCS,@SegFW,@SubSegFormal,@CatSh,@SubCatOxford,@GrpCL,@SeaAW25,@GenM,'Black','Formal','Lace-Up','64039990','PAIRS',4495.00,2500.00,1,'2025-09-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'US-LOA-001')
    INSERT INTO product.Articles (TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
    VALUES (@TenantId,'US-LOA-001','UrbanStep Casual Loafer - Tan',@BrandUS,@SegFW,@SubSegCasual,@CatSh,@SubCatLoafer,@GrpUB,@SeaSS25,@GenM,'Tan','Casual','Slip-On','64039990','PAIRS',2995.00,1600.00,1,'2025-03-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'US-LOA-002')
    INSERT INTO product.Articles (TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
    VALUES (@TenantId,'US-LOA-002','UrbanStep Casual Loafer - Navy',@BrandUS,@SegFW,@SubSegCasual,@CatSh,@SubCatLoafer,@GrpUB,@SeaSS25,@GenW,'Navy','Casual','Slip-On','64039990','PAIRS',2795.00,1500.00,1,'2025-03-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-001')
    INSERT INTO product.Articles (TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
    VALUES (@TenantId,'RF-SNK-001','RunFast Sport Sneaker - White',@BrandRF,@SegFW,@SubSegSports,@CatSh,@SubCatSneaker,@GrpSP,@SeaSS25,@GenU,'White','Sports','Lace-Up','64041990','PAIRS',3495.00,1800.00,1,'2025-03-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-002')
    INSERT INTO product.Articles (TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
    VALUES (@TenantId,'RF-SNK-002','RunFast Sport Sneaker - Black',@BrandRF,@SegFW,@SubSegSports,@CatSh,@SubCatSneaker,@GrpSP,@SeaSS25,@GenU,'Black','Sports','Lace-Up','64041990','PAIRS',3495.00,1800.00,1,'2025-03-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'BC-TOT-001')
    INSERT INTO product.Articles (TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
    VALUES (@TenantId,'BC-TOT-001','BagCraft Executive Tote - Black',@BrandBC,@SegLG,@SubSegHandbags,@CatBg,@SubCatTote,@GrpEX,@SeaAW25,@GenW,'Black','Formal','Zip','42021290','PCS',5995.00,3200.00,0,'2025-09-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'BC-BRF-001')
    INSERT INTO product.Articles (TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
    VALUES (@TenantId,'BC-BRF-001','BagCraft Leather Briefcase - Brown',@BrandBC,@SegLG,@SubSegHandbags,@CatBg,@SubCatBriefcase,@GrpEX,@SeaAW25,@GenM,'Brown','Formal','Buckle','42021290','PCS',7995.00,4200.00,0,'2025-09-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'BK-BLT-001')
    INSERT INTO product.Articles (TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
    VALUES (@TenantId,'BK-BLT-001','BeltKing Formal Leather Belt - Black',@BrandBK,@SegLG,@SubSegAccessory,@CatBlt,@SubCatFBelt,@GrpCL,@SeaAW25,@GenM,'Black','Formal','Buckle','42033000','PCS',1295.00,650.00,0,'2025-09-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'BK-BLT-002')
    INSERT INTO product.Articles (TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
    VALUES (@TenantId,'BK-BLT-002','BeltKing Formal Leather Belt - Brown',@BrandBK,@SegLG,@SubSegAccessory,@CatBlt,@SubCatFBelt,@GrpCL,@SeaAW25,@GenM,'Brown','Formal','Buckle','42033000','PCS',1295.00,650.00,0,'2025-09-01');

-- FootwearDetails
DECLARE @ArtId UNIQUEIDENTIFIER;
SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-001';
IF NOT EXISTS (SELECT 1 FROM product.FootwearDetails WHERE ArticleId = @ArtId)
    INSERT INTO product.FootwearDetails VALUES (NEWID(),@ArtId,'806','Full Grain Cow Leather','Pig Leather Lining','TPR Sole',39,46);

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-002';
IF NOT EXISTS (SELECT 1 FROM product.FootwearDetails WHERE ArticleId = @ArtId)
    INSERT INTO product.FootwearDetails VALUES (NEWID(),@ArtId,'806','Full Grain Cow Leather','Pig Leather Lining','TPR Sole',39,46);

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-OXF-001';
IF NOT EXISTS (SELECT 1 FROM product.FootwearDetails WHERE ArticleId = @ArtId)
    INSERT INTO product.FootwearDetails VALUES (NEWID(),@ArtId,'904','Full Grain Cow Leather','Soft Leather Lining','Leather Sole',39,46);

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'US-LOA-001';
IF NOT EXISTS (SELECT 1 FROM product.FootwearDetails WHERE ArticleId = @ArtId)
    INSERT INTO product.FootwearDetails VALUES (NEWID(),@ArtId,'702','Nubuck Leather','Mesh Lining','Rubber Sole',39,46);

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'US-LOA-002';
IF NOT EXISTS (SELECT 1 FROM product.FootwearDetails WHERE ArticleId = @ArtId)
    INSERT INTO product.FootwearDetails VALUES (NEWID(),@ArtId,'702','Nubuck Leather','Mesh Lining','Rubber Sole',35,41);

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-001';
IF NOT EXISTS (SELECT 1 FROM product.FootwearDetails WHERE ArticleId = @ArtId)
    INSERT INTO product.FootwearDetails VALUES (NEWID(),@ArtId,'501','Synthetic Upper','Mesh Lining','EVA+Rubber Sole',39,46);

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-002';
IF NOT EXISTS (SELECT 1 FROM product.FootwearDetails WHERE ArticleId = @ArtId)
    INSERT INTO product.FootwearDetails VALUES (NEWID(),@ArtId,'501','Synthetic Upper','Mesh Lining','EVA+Rubber Sole',39,46);

-- LeatherGoodsDetails
SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'BC-TOT-001';
IF NOT EXISTS (SELECT 1 FROM product.LeatherGoodsDetails WHERE ArticleId = @ArtId)
    INSERT INTO product.LeatherGoodsDetails VALUES (NEWID(),@ArtId,'40cm x 30cm x 12cm','Metal Zip + Magnetic Clasp');

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'BC-BRF-001';
IF NOT EXISTS (SELECT 1 FROM product.LeatherGoodsDetails WHERE ArticleId = @ArtId)
    INSERT INTO product.LeatherGoodsDetails VALUES (NEWID(),@ArtId,'45cm x 32cm x 10cm','Combination Lock + Zip');

-- ArticleSizes: Men EUR 39-46
DECLARE @SizeData TABLE (EuroSize INT, UKSize DECIMAL(5,1), USSize DECIMAL(5,1));
INSERT INTO @SizeData VALUES (39,6.0,6.5),(40,6.5,7.0),(41,7.0,7.5),(42,7.5,8.0),(43,8.0,8.5),(44,9.0,9.5),(45,10.0,10.5),(46,11.0,11.5);

INSERT INTO product.ArticleSizes (ArticleId, EuroSize, UKSize, USSize, MRP)
SELECT a.ArticleId, s.EuroSize, s.UKSize, s.USSize, a.MRP
FROM product.Articles a CROSS JOIN @SizeData s
WHERE a.TenantId = @TenantId AND a.ArticleCode IN ('CS-DRB-001','CS-DRB-002','CS-OXF-001','US-LOA-001','RF-SNK-001','RF-SNK-002')
AND NOT EXISTS (SELECT 1 FROM product.ArticleSizes x WHERE x.ArticleId = a.ArticleId AND x.EuroSize = s.EuroSize);

-- Women EUR 35-41 (US-LOA-002)
DECLARE @WomenSizes TABLE (EuroSize INT, UKSize DECIMAL(5,1), USSize DECIMAL(5,1));
INSERT INTO @WomenSizes VALUES (35,2.5,5.0),(36,3.0,5.5),(37,4.0,6.0),(38,4.5,6.5),(39,5.5,7.5),(40,6.5,8.5),(41,7.5,9.5);
SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'US-LOA-002';
INSERT INTO product.ArticleSizes (ArticleId, EuroSize, UKSize, USSize, MRP)
SELECT @ArtId, s.EuroSize, s.UKSize, s.USSize, 2795.00 FROM @WomenSizes s
WHERE NOT EXISTS (SELECT 1 FROM product.ArticleSizes x WHERE x.ArticleId = @ArtId AND x.EuroSize = s.EuroSize);

PRINT 'Section 9: Articles, FootwearDetails, LeatherGoodsDetails, ArticleSizes seeded.';
GO

-- ============================================================
-- SECTION 10: CLIENTS & STORES
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId UNIQUEIDENTIFIER; SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';

INSERT INTO sales.Clients (TenantId, ClientCode, ClientName, Organisation, GSTIN, StateId, StateCode, State, Zone, Email, ContactNo, MarginPercent, MarginType)
SELECT s.TenantId, s.ClientCode, s.ClientName, s.Org, s.GSTIN, s.StateId, s.StateCode, s.StateName, s.Zone, s.Email, s.ContactNo, s.Margin, 'NET OF TAXES'
FROM (VALUES
    (@TenantId,'CLT-001','VISION FOOTWEAR',  'Vision Retail Pvt Ltd', '27ABCPV1234A1Z1',27,'27','Maharashtra','WEST', 'vision@retail.com',   '9811001001',30.00),
    (@TenantId,'CLT-002','METRO SHOES',       'Metro Brands Ltd',      '29AAAMB5678B1Z2',29,'29','Karnataka',  'SOUTH','metro@brands.com',    '9822002002',28.00),
    (@TenantId,'CLT-003','LIBERTY SHOES',     'Liberty Shoes Ltd',     '07AALCL3456C1Z3', 7,'07','Delhi',      'NORTH','liberty@shoes.in',    '9833003003',25.00),
    (@TenantId,'CLT-004','BEST WALK',         'Best Walk Retail LLP',  '33AACFB7890D1Z4',33,'33','Tamil Nadu', 'SOUTH','bestwalk@retail.in',  '9844004004',27.00),
    (@TenantId,'CLT-005','EAST INDIA FOOTWEAR','East India Footwear Co','19AADFE2345E1Z5',19,'19','West Bengal','EAST', 'eifw@gmail.com',      '9855005005',22.00)
) AS s(TenantId,ClientCode,ClientName,Org,GSTIN,StateId,StateCode,StateName,Zone,Email,ContactNo,Margin)
WHERE NOT EXISTS (SELECT 1 FROM sales.Clients c WHERE c.TenantId = s.TenantId AND c.ClientCode = s.ClientCode);

DECLARE @CLT001 UNIQUEIDENTIFIER; SELECT @CLT001 = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-001';
DECLARE @CLT002 UNIQUEIDENTIFIER; SELECT @CLT002 = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-002';
DECLARE @CLT003 UNIQUEIDENTIFIER; SELECT @CLT003 = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-003';
DECLARE @CLT004 UNIQUEIDENTIFIER; SELECT @CLT004 = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-004';
DECLARE @CLT005 UNIQUEIDENTIFIER; SELECT @CLT005 = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-005';

INSERT INTO sales.Stores (TenantId, ClientId, StoreCode, StoreName, Format, City, State, Channel, ModusOperandi, MarginPercent, MarginType, ManagerName, GSTIN)
SELECT s.TenantId, s.ClientId, s.StoreCode, s.StoreName, s.Format, s.City, s.State, s.Channel, s.MO, s.Margin, 'NET OF TAXES', s.Manager, s.GSTIN
FROM (VALUES
    (@TenantId,@CLT001,'STR-001-MBD','Vision - Malad Mumbai',            'RETAIL_MALL',        'Mumbai',    'Maharashtra','MBO','SOR',    30.00,'Ravi Verma',    '27ABCPV1234A1Z1'),
    (@TenantId,@CLT001,'STR-001-PNE','Vision - FC Road Pune',            'RETAIL_HIGH_STREET', 'Pune',      'Maharashtra','MBO','SOR',    30.00,'Pooja Nair',    '27ABCPV1234A2Z1'),
    (@TenantId,@CLT002,'STR-002-BLR','Metro - Orion Mall Bangalore',     'RETAIL_MALL',        'Bangalore', 'Karnataka',  'MBO','OUT_MKT',28.00,'Suresh Kumar',  '29AAAMB5678B1Z2'),
    (@TenantId,@CLT002,'STR-002-CHN','Metro - Express Avenue Chennai',   'RETAIL_MALL',        'Chennai',   'Tamil Nadu', 'MBO','OUT_MKT',28.00,'Preethi Raj',   '33AAAMB5678B2Z2'),
    (@TenantId,@CLT003,'STR-003-DLH','Liberty - CP Delhi',               'RETAIL_HIGH_STREET', 'New Delhi', 'Delhi',      'EBO','OUT_MKT',25.00,'Vikram Singh',  '07AALCL3456C1Z3'),
    (@TenantId,@CLT004,'STR-004-CHN','BestWalk - Anna Nagar Chennai',    'RETAIL_HIGH_STREET', 'Chennai',   'Tamil Nadu', 'MBO','SOR',    27.00,'Anand Raj',     '33AACFB7890D1Z4'),
    (@TenantId,@CLT005,'STR-005-KOL','EIF - Park Street Kolkata',        'RETAIL_HIGH_STREET', 'Kolkata',   'West Bengal','EBO','SOR',    22.00,'Saurav Das',    '19AADFE2345E1Z5')
) AS s(TenantId,ClientId,StoreCode,StoreName,Format,City,State,Channel,MO,Margin,Manager,GSTIN)
WHERE NOT EXISTS (SELECT 1 FROM sales.Stores st WHERE st.TenantId = s.TenantId AND st.StoreCode = s.StoreCode);

PRINT 'Section 10: Clients and Stores seeded.';
GO

-- ============================================================
-- SECTION 11: PRODUCTION ORDERS
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId    UNIQUEIDENTIFIER; SELECT @TenantId    = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';
DECLARE @AdminUserId UNIQUEIDENTIFIER;
SELECT TOP 1 @AdminUserId = u.UserId FROM auth.Users u
INNER JOIN auth.Roles r ON u.RoleId = r.RoleId WHERE r.TenantId = @TenantId AND r.RoleName = 'Admin';

DECLARE @ArtDRB001 UNIQUEIDENTIFIER; SELECT @ArtDRB001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-001';
DECLARE @ArtDRB002 UNIQUEIDENTIFIER; SELECT @ArtDRB002 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-002';
DECLARE @ArtSNK001 UNIQUEIDENTIFIER; SELECT @ArtSNK001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-001';
DECLARE @GrpEX     UNIQUEIDENTIFIER; SELECT @GrpEX     = GroupId   FROM master.Groups    WHERE TenantId = @TenantId AND GroupName = 'Executive Collection';
DECLARE @GrpSP     UNIQUEIDENTIFIER; SELECT @GrpSP     = GroupId   FROM master.Groups    WHERE TenantId = @TenantId AND GroupName = 'Sport Collection';

DECLARE @POId UNIQUEIDENTIFIER;
IF NOT EXISTS (SELECT 1 FROM production.ProductionOrders WHERE TenantId = @TenantId AND OrderNo = 'PO-2025-001')
BEGIN
    SET @POId = NEWID();
    INSERT INTO production.ProductionOrders (ProductionOrderId,TenantId,OrderNo,OrderDate,ArticleId,GroupId,Color,Last,UpperLeather,LiningLeather,Sole,OrderType,TotalQuantity,Status,ApprovedBy,ApprovedAt,CreatedBy)
    VALUES (@POId,@TenantId,'PO-2025-001','2025-10-01',@ArtDRB001,@GrpEX,'Black','806','Full Grain Cow Leather','Pig Leather Lining','TPR Sole','FRESH',480,'COMPLETED',@AdminUserId,'2025-10-02',@AdminUserId);
    INSERT INTO production.ProductionSizeRuns (ProductionOrderId,EuroSize,Quantity,ProducedQty) VALUES
        (@POId,39,50,50),(@POId,40,60,60),(@POId,41,70,70),(@POId,42,80,80),(@POId,43,80,80),(@POId,44,70,70),(@POId,45,50,50),(@POId,46,20,20);
END

IF NOT EXISTS (SELECT 1 FROM production.ProductionOrders WHERE TenantId = @TenantId AND OrderNo = 'PO-2025-002')
BEGIN
    SET @POId = NEWID();
    INSERT INTO production.ProductionOrders (ProductionOrderId,TenantId,OrderNo,OrderDate,ArticleId,GroupId,Color,Last,UpperLeather,LiningLeather,Sole,OrderType,TotalQuantity,Status,ApprovedBy,ApprovedAt,CreatedBy)
    VALUES (@POId,@TenantId,'PO-2025-002','2025-10-05',@ArtDRB002,@GrpEX,'Brown','806','Full Grain Cow Leather','Pig Leather Lining','TPR Sole','FRESH',360,'COMPLETED',@AdminUserId,'2025-10-06',@AdminUserId);
    INSERT INTO production.ProductionSizeRuns (ProductionOrderId,EuroSize,Quantity,ProducedQty) VALUES
        (@POId,39,40,40),(@POId,40,50,50),(@POId,41,60,60),(@POId,42,60,60),(@POId,43,60,60),(@POId,44,50,50),(@POId,45,30,30),(@POId,46,10,10);
END

IF NOT EXISTS (SELECT 1 FROM production.ProductionOrders WHERE TenantId = @TenantId AND OrderNo = 'PO-2025-003')
BEGIN
    SET @POId = NEWID();
    INSERT INTO production.ProductionOrders (ProductionOrderId,TenantId,OrderNo,OrderDate,ArticleId,GroupId,Color,Last,UpperLeather,LiningLeather,Sole,OrderType,TotalQuantity,Status,ApprovedBy,ApprovedAt,CreatedBy)
    VALUES (@POId,@TenantId,'PO-2025-003','2025-11-01',@ArtSNK001,@GrpSP,'White','501','Synthetic Upper','Mesh Lining','EVA+Rubber Sole','REPLENISHMENT',320,'IN_PRODUCTION',@AdminUserId,'2025-11-02',@AdminUserId);
    INSERT INTO production.ProductionSizeRuns (ProductionOrderId,EuroSize,Quantity,ProducedQty) VALUES
        (@POId,39,30,15),(@POId,40,40,20),(@POId,41,50,25),(@POId,42,60,30),(@POId,43,60,30),(@POId,44,50,25),(@POId,45,20,10),(@POId,46,10,5);
END

PRINT 'Section 11: Production Orders seeded.';
GO

-- ============================================================
-- SECTION 12: GRN + STOCK LEDGER
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId    UNIQUEIDENTIFIER; SELECT @TenantId    = TenantId    FROM auth.Tenants         WHERE TenantCode = 'ELCURIO';
DECLARE @WHMumbai    UNIQUEIDENTIFIER; SELECT @WHMumbai    = WarehouseId FROM warehouse.Warehouses WHERE TenantId = @TenantId AND WarehouseCode = 'WH-MH';
DECLARE @WHDelhi     UNIQUEIDENTIFIER; SELECT @WHDelhi     = WarehouseId FROM warehouse.Warehouses WHERE TenantId = @TenantId AND WarehouseCode = 'WH-DL';
DECLARE @AdminUserId UNIQUEIDENTIFIER;
SELECT TOP 1 @AdminUserId = u.UserId FROM auth.Users u INNER JOIN auth.Roles r ON u.RoleId = r.RoleId WHERE r.TenantId = @TenantId AND r.RoleName = 'Admin';

DECLARE @ArtDRB001 UNIQUEIDENTIFIER; SELECT @ArtDRB001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-001';
DECLARE @ArtDRB002 UNIQUEIDENTIFIER; SELECT @ArtDRB002 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-002';
DECLARE @ArtLOA001 UNIQUEIDENTIFIER; SELECT @ArtLOA001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'US-LOA-001';
DECLARE @ArtLOA002 UNIQUEIDENTIFIER; SELECT @ArtLOA002 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'US-LOA-002';
DECLARE @ArtSNK001 UNIQUEIDENTIFIER; SELECT @ArtSNK001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-001';
DECLARE @ArtSNK002 UNIQUEIDENTIFIER; SELECT @ArtSNK002 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-002';

DECLARE @GRNId UNIQUEIDENTIFIER;

-- GRN-2025-001: Mumbai CS-DRB-001
IF NOT EXISTS (SELECT 1 FROM inventory.GoodsReceivedNotes WHERE TenantId = @TenantId AND GRNNumber = 'GRN-2025-001')
BEGIN
    SET @GRNId = NEWID();
    INSERT INTO inventory.GoodsReceivedNotes (GRNId,TenantId,GRNNumber,WarehouseId,ReceiptDate,SourceType,ReferenceNo,Status,TotalQuantity,CreatedBy)
    VALUES (@GRNId,@TenantId,'GRN-2025-001',@WHMumbai,'2025-10-20','Production','PO-2025-001','Confirmed',480,@AdminUserId);
    INSERT INTO inventory.GRNLines (GRNId,ArticleId,EuroSize,Quantity) VALUES
        (@GRNId,@ArtDRB001,39,50),(@GRNId,@ArtDRB001,40,60),(@GRNId,@ArtDRB001,41,70),(@GRNId,@ArtDRB001,42,80),
        (@GRNId,@ArtDRB001,43,80),(@GRNId,@ArtDRB001,44,70),(@GRNId,@ArtDRB001,45,50),(@GRNId,@ArtDRB001,46,20);
END

-- GRN-2025-002: Mumbai CS-DRB-002
IF NOT EXISTS (SELECT 1 FROM inventory.GoodsReceivedNotes WHERE TenantId = @TenantId AND GRNNumber = 'GRN-2025-002')
BEGIN
    SET @GRNId = NEWID();
    INSERT INTO inventory.GoodsReceivedNotes (GRNId,TenantId,GRNNumber,WarehouseId,ReceiptDate,SourceType,ReferenceNo,Status,TotalQuantity,CreatedBy)
    VALUES (@GRNId,@TenantId,'GRN-2025-002',@WHMumbai,'2025-10-22','Production','PO-2025-002','Confirmed',360,@AdminUserId);
    INSERT INTO inventory.GRNLines (GRNId,ArticleId,EuroSize,Quantity) VALUES
        (@GRNId,@ArtDRB002,39,40),(@GRNId,@ArtDRB002,40,50),(@GRNId,@ArtDRB002,41,60),(@GRNId,@ArtDRB002,42,60),
        (@GRNId,@ArtDRB002,43,60),(@GRNId,@ArtDRB002,44,50),(@GRNId,@ArtDRB002,45,30),(@GRNId,@ArtDRB002,46,10);
END

-- GRN-2025-003: Delhi LOA-001 + SNK-001
IF NOT EXISTS (SELECT 1 FROM inventory.GoodsReceivedNotes WHERE TenantId = @TenantId AND GRNNumber = 'GRN-2025-003')
BEGIN
    SET @GRNId = NEWID();
    INSERT INTO inventory.GoodsReceivedNotes (GRNId,TenantId,GRNNumber,WarehouseId,ReceiptDate,SourceType,ReferenceNo,Status,TotalQuantity,CreatedBy)
    VALUES (@GRNId,@TenantId,'GRN-2025-003',@WHDelhi,'2025-11-01','Purchase','PO-VENDOR-101','Confirmed',480,@AdminUserId);
    INSERT INTO inventory.GRNLines (GRNId,ArticleId,EuroSize,Quantity) VALUES
        (@GRNId,@ArtLOA001,39,20),(@GRNId,@ArtLOA001,40,30),(@GRNId,@ArtLOA001,41,40),(@GRNId,@ArtLOA001,42,40),
        (@GRNId,@ArtLOA001,43,30),(@GRNId,@ArtLOA001,44,20),(@GRNId,@ArtLOA001,45,10),(@GRNId,@ArtLOA001,46,10),
        (@GRNId,@ArtSNK001,39,30),(@GRNId,@ArtSNK001,40,40),(@GRNId,@ArtSNK001,41,50),(@GRNId,@ArtSNK001,42,50),
        (@GRNId,@ArtSNK001,43,40),(@GRNId,@ArtSNK001,44,30),(@GRNId,@ArtSNK001,45,20),(@GRNId,@ArtSNK001,46,10);
END

-- Stock Ledger: Mumbai footwear (EUR 39-46)
DECLARE @Sizes TABLE (EuroSize INT);
INSERT INTO @Sizes VALUES (39),(40),(41),(42),(43),(44),(45),(46);

-- CS-DRB-001 Mumbai
INSERT INTO inventory.StockLedger (TenantId,WarehouseId,ArticleId,EuroSize,OpeningStock,InwardQty,OutwardQty)
SELECT @TenantId,@WHMumbai,@ArtDRB001,s.EuroSize,
    CASE s.EuroSize WHEN 39 THEN 50 WHEN 40 THEN 60 WHEN 41 THEN 70 WHEN 42 THEN 80 WHEN 43 THEN 80 WHEN 44 THEN 70 WHEN 45 THEN 50 WHEN 46 THEN 20 END,0,0
FROM @Sizes s
WHERE NOT EXISTS (SELECT 1 FROM inventory.StockLedger x WHERE x.TenantId=@TenantId AND x.WarehouseId=@WHMumbai AND x.ArticleId=@ArtDRB001 AND x.EuroSize=s.EuroSize);

-- CS-DRB-002 Mumbai
INSERT INTO inventory.StockLedger (TenantId,WarehouseId,ArticleId,EuroSize,OpeningStock,InwardQty,OutwardQty)
SELECT @TenantId,@WHMumbai,@ArtDRB002,s.EuroSize,
    CASE s.EuroSize WHEN 39 THEN 40 WHEN 40 THEN 50 WHEN 41 THEN 60 WHEN 42 THEN 60 WHEN 43 THEN 60 WHEN 44 THEN 50 WHEN 45 THEN 30 WHEN 46 THEN 10 END,0,0
FROM @Sizes s
WHERE NOT EXISTS (SELECT 1 FROM inventory.StockLedger x WHERE x.TenantId=@TenantId AND x.WarehouseId=@WHMumbai AND x.ArticleId=@ArtDRB002 AND x.EuroSize=s.EuroSize);

-- US-LOA-001 Mumbai
INSERT INTO inventory.StockLedger (TenantId,WarehouseId,ArticleId,EuroSize,OpeningStock,InwardQty,OutwardQty)
SELECT @TenantId,@WHMumbai,@ArtLOA001,s.EuroSize,
    CASE s.EuroSize WHEN 39 THEN 25 WHEN 40 THEN 35 WHEN 41 THEN 40 WHEN 42 THEN 40 WHEN 43 THEN 35 WHEN 44 THEN 25 WHEN 45 THEN 15 WHEN 46 THEN 5 END,0,0
FROM @Sizes s
WHERE NOT EXISTS (SELECT 1 FROM inventory.StockLedger x WHERE x.TenantId=@TenantId AND x.WarehouseId=@WHMumbai AND x.ArticleId=@ArtLOA001 AND x.EuroSize=s.EuroSize);

-- RF-SNK-001 Mumbai
INSERT INTO inventory.StockLedger (TenantId,WarehouseId,ArticleId,EuroSize,OpeningStock,InwardQty,OutwardQty)
SELECT @TenantId,@WHMumbai,@ArtSNK001,s.EuroSize,
    CASE s.EuroSize WHEN 39 THEN 40 WHEN 40 THEN 50 WHEN 41 THEN 60 WHEN 42 THEN 60 WHEN 43 THEN 50 WHEN 44 THEN 40 WHEN 45 THEN 20 WHEN 46 THEN 10 END,0,0
FROM @Sizes s
WHERE NOT EXISTS (SELECT 1 FROM inventory.StockLedger x WHERE x.TenantId=@TenantId AND x.WarehouseId=@WHMumbai AND x.ArticleId=@ArtSNK001 AND x.EuroSize=s.EuroSize);

-- US-LOA-002 Mumbai (EUR 35-41 women)
DECLARE @WomSizes TABLE (EuroSize INT);
INSERT INTO @WomSizes VALUES (35),(36),(37),(38),(39),(40),(41);
INSERT INTO inventory.StockLedger (TenantId,WarehouseId,ArticleId,EuroSize,OpeningStock,InwardQty,OutwardQty)
SELECT @TenantId,@WHMumbai,@ArtLOA002,s.EuroSize,
    CASE s.EuroSize WHEN 35 THEN 15 WHEN 36 THEN 25 WHEN 37 THEN 35 WHEN 38 THEN 35 WHEN 39 THEN 25 WHEN 40 THEN 15 WHEN 41 THEN 10 END,0,0
FROM @WomSizes s
WHERE NOT EXISTS (SELECT 1 FROM inventory.StockLedger x WHERE x.TenantId=@TenantId AND x.WarehouseId=@WHMumbai AND x.ArticleId=@ArtLOA002 AND x.EuroSize=s.EuroSize);

-- Delhi: US-LOA-001, RF-SNK-001, RF-SNK-002
INSERT INTO inventory.StockLedger (TenantId,WarehouseId,ArticleId,EuroSize,OpeningStock,InwardQty,OutwardQty)
SELECT @TenantId,@WHDelhi,@ArtLOA001,s.EuroSize,
    CASE s.EuroSize WHEN 39 THEN 20 WHEN 40 THEN 30 WHEN 41 THEN 40 WHEN 42 THEN 40 WHEN 43 THEN 30 WHEN 44 THEN 20 WHEN 45 THEN 10 WHEN 46 THEN 10 END,0,0
FROM @Sizes s
WHERE NOT EXISTS (SELECT 1 FROM inventory.StockLedger x WHERE x.TenantId=@TenantId AND x.WarehouseId=@WHDelhi AND x.ArticleId=@ArtLOA001 AND x.EuroSize=s.EuroSize);

INSERT INTO inventory.StockLedger (TenantId,WarehouseId,ArticleId,EuroSize,OpeningStock,InwardQty,OutwardQty)
SELECT @TenantId,@WHDelhi,@ArtSNK001,s.EuroSize,
    CASE s.EuroSize WHEN 39 THEN 30 WHEN 40 THEN 40 WHEN 41 THEN 50 WHEN 42 THEN 50 WHEN 43 THEN 40 WHEN 44 THEN 30 WHEN 45 THEN 20 WHEN 46 THEN 10 END,0,0
FROM @Sizes s
WHERE NOT EXISTS (SELECT 1 FROM inventory.StockLedger x WHERE x.TenantId=@TenantId AND x.WarehouseId=@WHDelhi AND x.ArticleId=@ArtSNK001 AND x.EuroSize=s.EuroSize);

INSERT INTO inventory.StockLedger (TenantId,WarehouseId,ArticleId,EuroSize,OpeningStock,InwardQty,OutwardQty)
SELECT @TenantId,@WHDelhi,@ArtSNK002,s.EuroSize,
    CASE s.EuroSize WHEN 39 THEN 25 WHEN 40 THEN 35 WHEN 41 THEN 45 WHEN 42 THEN 45 WHEN 43 THEN 35 WHEN 44 THEN 25 WHEN 45 THEN 15 WHEN 46 THEN 5 END,0,0
FROM @Sizes s
WHERE NOT EXISTS (SELECT 1 FROM inventory.StockLedger x WHERE x.TenantId=@TenantId AND x.WarehouseId=@WHDelhi AND x.ArticleId=@ArtSNK002 AND x.EuroSize=s.EuroSize);

-- Leather goods (non-size-based) NULL EuroSize
INSERT INTO inventory.StockLedger (TenantId,WarehouseId,ArticleId,EuroSize,OpeningStock,InwardQty,OutwardQty)
SELECT @TenantId,@WHMumbai,a.ArticleId,NULL,50,0,0
FROM product.Articles a
WHERE a.TenantId = @TenantId AND a.ArticleCode IN ('BC-TOT-001','BC-BRF-001','BK-BLT-001','BK-BLT-002')
AND NOT EXISTS (SELECT 1 FROM inventory.StockLedger x WHERE x.TenantId=@TenantId AND x.WarehouseId=@WHMumbai AND x.ArticleId=a.ArticleId AND x.EuroSize IS NULL);

PRINT 'Section 12: GRN and StockLedger seeded.';
GO

-- ============================================================
-- SECTION 13: CUSTOMER ORDERS
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId    UNIQUEIDENTIFIER; SELECT @TenantId    = TenantId    FROM auth.Tenants         WHERE TenantCode = 'ELCURIO';
DECLARE @WHMumbai    UNIQUEIDENTIFIER; SELECT @WHMumbai    = WarehouseId FROM warehouse.Warehouses WHERE TenantId = @TenantId AND WarehouseCode = 'WH-MH';
DECLARE @CLT001      UNIQUEIDENTIFIER; SELECT @CLT001      = ClientId    FROM sales.Clients         WHERE TenantId = @TenantId AND ClientCode = 'CLT-001';
DECLARE @CLT002      UNIQUEIDENTIFIER; SELECT @CLT002      = ClientId    FROM sales.Clients         WHERE TenantId = @TenantId AND ClientCode = 'CLT-002';
DECLARE @STR001      UNIQUEIDENTIFIER; SELECT @STR001      = StoreId     FROM sales.Stores          WHERE TenantId = @TenantId AND StoreCode  = 'STR-001-MBD';
DECLARE @STR002      UNIQUEIDENTIFIER; SELECT @STR002      = StoreId     FROM sales.Stores          WHERE TenantId = @TenantId AND StoreCode  = 'STR-002-BLR';
DECLARE @AdminUserId UNIQUEIDENTIFIER;
SELECT TOP 1 @AdminUserId = u.UserId FROM auth.Users u INNER JOIN auth.Roles r ON u.RoleId = r.RoleId WHERE r.TenantId = @TenantId AND r.RoleName = 'Admin';

DECLARE @ArtDRB001 UNIQUEIDENTIFIER; SELECT @ArtDRB001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-001';
DECLARE @ArtDRB002 UNIQUEIDENTIFIER; SELECT @ArtDRB002 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-002';
DECLARE @ArtSNK001 UNIQUEIDENTIFIER; SELECT @ArtSNK001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-001';

DECLARE @OrdId UNIQUEIDENTIFIER;
IF NOT EXISTS (SELECT 1 FROM sales.CustomerOrders WHERE TenantId = @TenantId AND OrderNo = 'ORD-2025-001')
BEGIN
    SET @OrdId = NEWID();
    INSERT INTO sales.CustomerOrders (OrderId,TenantId,OrderNo,OrderDate,ClientId,StoreId,WarehouseId,TotalQuantity,TotalMRP,TotalAmount,Status,ConfirmedBy,ConfirmedAt,CreatedBy)
    VALUES (@OrdId,@TenantId,'ORD-2025-001','2025-11-01',@CLT001,@STR001,@WHMumbai,160,479200.00,335440.00,'DISPATCHED',@AdminUserId,'2025-11-02',@AdminUserId);
    INSERT INTO sales.OrderLines (OrderLineId,OrderId,ArticleId,Color,EuroSize,HSNCode,MRP,Quantity,DispatchedQty,LineTotal,StockAvailable)
    SELECT NEWID(),@OrdId,@ArtDRB001,'Black',s.EuroSize,'64039990',3995.00,
        CASE s.EuroSize WHEN 39 THEN 15 WHEN 40 THEN 20 WHEN 41 THEN 25 WHEN 42 THEN 25 WHEN 43 THEN 20 WHEN 44 THEN 15 WHEN 45 THEN 10 WHEN 46 THEN 5 END,
        CASE s.EuroSize WHEN 39 THEN 15 WHEN 40 THEN 20 WHEN 41 THEN 25 WHEN 42 THEN 25 WHEN 43 THEN 20 WHEN 44 THEN 15 WHEN 45 THEN 10 WHEN 46 THEN 5 END,
        3995.00 * CASE s.EuroSize WHEN 39 THEN 15 WHEN 40 THEN 20 WHEN 41 THEN 25 WHEN 42 THEN 25 WHEN 43 THEN 20 WHEN 44 THEN 15 WHEN 45 THEN 10 WHEN 46 THEN 5 END, 1
    FROM (VALUES (39),(40),(41),(42),(43),(44),(45),(46)) AS s(EuroSize);
END

IF NOT EXISTS (SELECT 1 FROM sales.CustomerOrders WHERE TenantId = @TenantId AND OrderNo = 'ORD-2025-002')
BEGIN
    SET @OrdId = NEWID();
    INSERT INTO sales.CustomerOrders (OrderId,TenantId,OrderNo,OrderDate,ClientId,StoreId,WarehouseId,TotalQuantity,TotalMRP,TotalAmount,Status,ConfirmedBy,ConfirmedAt,CreatedBy)
    VALUES (@OrdId,@TenantId,'ORD-2025-002','2025-11-05',@CLT002,@STR002,@WHMumbai,120,419400.00,293580.00,'CONFIRMED',@AdminUserId,'2025-11-06',@AdminUserId);
    INSERT INTO sales.OrderLines (OrderLineId,OrderId,ArticleId,Color,EuroSize,HSNCode,MRP,Quantity,DispatchedQty,LineTotal,StockAvailable)
    SELECT NEWID(),@OrdId,@ArtDRB002,'Brown',s.EuroSize,'64039990',3995.00,
        CASE s.EuroSize WHEN 39 THEN 12 WHEN 40 THEN 16 WHEN 41 THEN 20 WHEN 42 THEN 20 WHEN 43 THEN 18 WHEN 44 THEN 16 WHEN 45 THEN 12 WHEN 46 THEN 6 END,
        0,
        3995.00 * CASE s.EuroSize WHEN 39 THEN 12 WHEN 40 THEN 16 WHEN 41 THEN 20 WHEN 42 THEN 20 WHEN 43 THEN 18 WHEN 44 THEN 16 WHEN 45 THEN 12 WHEN 46 THEN 6 END, 1
    FROM (VALUES (39),(40),(41),(42),(43),(44),(45),(46)) AS s(EuroSize);
END

IF NOT EXISTS (SELECT 1 FROM sales.CustomerOrders WHERE TenantId = @TenantId AND OrderNo = 'ORD-2025-003')
BEGIN
    SET @OrdId = NEWID();
    INSERT INTO sales.CustomerOrders (OrderId,TenantId,OrderNo,OrderDate,ClientId,StoreId,WarehouseId,TotalQuantity,TotalMRP,TotalAmount,Status,CreatedBy)
    VALUES (@OrdId,@TenantId,'ORD-2025-003','2025-11-10',@CLT001,@STR001,@WHMumbai,80,279600.00,195720.00,'DRAFT',@AdminUserId);
    INSERT INTO sales.OrderLines (OrderLineId,OrderId,ArticleId,Color,EuroSize,HSNCode,MRP,Quantity,DispatchedQty,LineTotal,StockAvailable)
    SELECT NEWID(),@OrdId,@ArtSNK001,'White',s.EuroSize,'64041990',3495.00,
        CASE s.EuroSize WHEN 39 THEN 8 WHEN 40 THEN 10 WHEN 41 THEN 12 WHEN 42 THEN 14 WHEN 43 THEN 14 WHEN 44 THEN 12 WHEN 45 THEN 6 WHEN 46 THEN 4 END,
        0,
        3495.00 * CASE s.EuroSize WHEN 39 THEN 8 WHEN 40 THEN 10 WHEN 41 THEN 12 WHEN 42 THEN 14 WHEN 43 THEN 14 WHEN 44 THEN 12 WHEN 45 THEN 6 WHEN 46 THEN 4 END, 1
    FROM (VALUES (39),(40),(41),(42),(43),(44),(45),(46)) AS s(EuroSize);
END

PRINT 'Section 13: CustomerOrders seeded.';
GO

-- ============================================================
-- SECTION 14: INVOICE (sample)
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId    UNIQUEIDENTIFIER; SELECT @TenantId    = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';
DECLARE @CLT001      UNIQUEIDENTIFIER; SELECT @CLT001      = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-001';
DECLARE @STR001      UNIQUEIDENTIFIER; SELECT @STR001      = StoreId  FROM sales.Stores  WHERE TenantId = @TenantId AND StoreCode  = 'STR-001-MBD';
DECLARE @OrdId       UNIQUEIDENTIFIER; SELECT @OrdId       = OrderId  FROM sales.CustomerOrders WHERE TenantId = @TenantId AND OrderNo = 'ORD-2025-001';
DECLARE @ArtDRB001   UNIQUEIDENTIFIER; SELECT @ArtDRB001   = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-001';
DECLARE @AdminUserId UNIQUEIDENTIFIER;
SELECT TOP 1 @AdminUserId = u.UserId FROM auth.Users u INNER JOIN auth.Roles r ON u.RoleId = r.RoleId WHERE r.TenantId = @TenantId AND r.RoleName = 'Admin';

IF NOT EXISTS (SELECT 1 FROM billing.Invoices WHERE TenantId = @TenantId AND InvoiceNo = 'SKH/001/2526')
BEGIN
    DECLARE @InvId UNIQUEIDENTIFIER = NEWID();
    INSERT INTO billing.Invoices (
        InvoiceId,TenantId,InvoiceNo,InvoiceDate,InvoiceType,OrderId,ClientId,StoreId,
        BillToName,BillToAddress,BillToGSTIN,BillToState,BillToStateCode,
        ShipToName,ShipToAddress,ShipToGSTIN,ShipToState,ShipToStateCode,
        PlaceOfSupply,PlaceOfSupplyCode,IsInterState,SalesType,
        SubTotal,TotalDiscount,TaxableAmount,CGSTAmount,SGSTAmount,IGSTAmount,TotalGST,GrandTotal,RoundOff,NetPayable,
        TotalQuantity,TotalAmount,Status,
        CompanyName,CompanyAddress,CompanyGSTIN,
        BankName,BankAccountNo,BankIFSC,BankBranch,CreatedBy)
    VALUES (
        @InvId,@TenantId,'SKH/001/2526','2025-11-15','TAX_INVOICE',@OrdId,@CLT001,@STR001,
        'Vision Retail Pvt Ltd','Vision Footwear, Malad, Mumbai 400001','27ABCPV1234A1Z1','Maharashtra','27',
        'Vision Footwear Malad','Malad West, Mumbai 400001','27ABCPV1234A1Z1','Maharashtra','27',
        'Maharashtra','27',0,'Local',
        639200.00,0.00,639200.00,57528.00,57528.00,0.00,115056.00,754256.00,0.00,754256.00,
        160,754256.00,'Draft',
        'SKH EXPORTS','Plot No. 17, Sector 5, Industrial Area, Bhiwandi, Mumbai 421302','27AABCE1234F1Z5',
        'HDFC BANK','50200073196749','HDFC0001295','RANIPET',@AdminUserId);

    -- Invoice lines (one per size)
    INSERT INTO billing.InvoiceLines (InvoiceLineId,InvoiceId,LineNumber,ArticleId,ArticleCode,ArticleName,HSNCode,Color,EuroSize,UOM,Quantity,MRP,MarginPercent,GSTRate,TotalAmount)
    SELECT NEWID(),@InvId,ROW_NUMBER() OVER (ORDER BY s.EuroSize),
        @ArtDRB001,'CS-DRB-001','ClassicStep Executive Derby - Black','64039990','Black',s.EuroSize,'PAIRS',
        CASE s.EuroSize WHEN 39 THEN 15 WHEN 40 THEN 20 WHEN 41 THEN 25 WHEN 42 THEN 25 WHEN 43 THEN 20 WHEN 44 THEN 15 WHEN 45 THEN 10 WHEN 46 THEN 5 END,
        3995.00, 30.00, 18.00,
        3995.00 * CASE s.EuroSize WHEN 39 THEN 15 WHEN 40 THEN 20 WHEN 41 THEN 25 WHEN 42 THEN 25 WHEN 43 THEN 20 WHEN 44 THEN 15 WHEN 45 THEN 10 WHEN 46 THEN 5 END
    FROM (VALUES (39),(40),(41),(42),(43),(44),(45),(46)) AS s(EuroSize);

    -- Calculate GST totals on the invoice
    EXEC billing.sp_Invoice_Calculate @InvId;
END

PRINT 'Section 14: Sample invoice seeded.';
GO

PRINT '=== FILE 3 COMPLETE: All seed data inserted ===';
PRINT '';
PRINT 'Default login credentials:';
PRINT '  admin@elcurio.com    / Admin@123  (Admin)';
PRINT '  warehouse@elcurio.com / Admin@123 (Storemanager)';
PRINT '  accounts@elcurio.com  / Admin@123 (Accountuser)';
PRINT '  viewer@elcurio.com    / Admin@123 (Viewer)';
GO
