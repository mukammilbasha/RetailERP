-- ============================================================
-- RetailERP - Full Seed Data (All Tables)
-- Idempotent: safe to run multiple times
-- Depends on: 011_seed_data.sql, 012_new_tables.sql
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

-- ============================================================
-- SECTION 0 - Resolve parent IDs from earlier seed
-- ============================================================
DECLARE @TenantId UNIQUEIDENTIFIER;
SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';
IF @TenantId IS NULL BEGIN PRINT 'ERROR: Tenant ELCURIO not found. Run 011_seed_data.sql first.'; RETURN; END

-- Roles
DECLARE @AdminRoleId     UNIQUEIDENTIFIER;
DECLARE @ManagerRoleId   UNIQUEIDENTIFIER;
DECLARE @AccountsRoleId  UNIQUEIDENTIFIER;
DECLARE @ViewerRoleId    UNIQUEIDENTIFIER;
SELECT @AdminRoleId    = RoleId FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Admin';
SELECT @ManagerRoleId  = RoleId FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Storemanager';
SELECT @AccountsRoleId = RoleId FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Accountuser';
SELECT @ViewerRoleId   = RoleId FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Viewer';

-- Warehouses
DECLARE @WHMumbaiId UNIQUEIDENTIFIER;
DECLARE @WHDelhiId  UNIQUEIDENTIFIER;
SELECT @WHMumbaiId = WarehouseId FROM warehouse.Warehouses WHERE TenantId = @TenantId AND WarehouseCode = 'WH-MH';
SELECT @WHDelhiId  = WarehouseId FROM warehouse.Warehouses WHERE TenantId = @TenantId AND WarehouseCode = 'WH-DL';

-- Brands
DECLARE @BrandClassicStepId UNIQUEIDENTIFIER;
DECLARE @BrandRunFastId     UNIQUEIDENTIFIER;
DECLARE @BrandUrbanStepId   UNIQUEIDENTIFIER;
DECLARE @BrandBagCraftId    UNIQUEIDENTIFIER;
DECLARE @BrandBeltKingId    UNIQUEIDENTIFIER;
SELECT @BrandClassicStepId = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'ClassicStep';
SELECT @BrandRunFastId     = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'RunFast';
SELECT @BrandUrbanStepId   = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'UrbanStep';
SELECT @BrandBagCraftId    = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'BagCraft';
SELECT @BrandBeltKingId    = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'BeltKing';

-- Segments
DECLARE @SegFootwearId     UNIQUEIDENTIFIER;
DECLARE @SegLeatherGoodsId UNIQUEIDENTIFIER;
SELECT @SegFootwearId     = SegmentId FROM master.Segments WHERE TenantId = @TenantId AND SegmentName = 'Footwear';
SELECT @SegLeatherGoodsId = SegmentId FROM master.Segments WHERE TenantId = @TenantId AND SegmentName = 'Leather Goods';

-- Categories
DECLARE @CatShoesId UNIQUEIDENTIFIER;
DECLARE @CatBagsId  UNIQUEIDENTIFIER;
DECLARE @CatBeltsId UNIQUEIDENTIFIER;
SELECT @CatShoesId = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Shoes';
SELECT @CatBagsId  = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Bags';
SELECT @CatBeltsId = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Belts';

-- Groups
DECLARE @GrpClassicId    UNIQUEIDENTIFIER;
DECLARE @GrpUrbanId      UNIQUEIDENTIFIER;
DECLARE @GrpExecutiveId  UNIQUEIDENTIFIER;
DECLARE @GrpSportId      UNIQUEIDENTIFIER;
SELECT @GrpClassicId   = GroupId FROM master.Groups WHERE TenantId = @TenantId AND GroupName = 'Classic Collection';
SELECT @GrpUrbanId     = GroupId FROM master.Groups WHERE TenantId = @TenantId AND GroupName = 'Urban Collection';
SELECT @GrpExecutiveId = GroupId FROM master.Groups WHERE TenantId = @TenantId AND GroupName = 'Executive Collection';
SELECT @GrpSportId     = GroupId FROM master.Groups WHERE TenantId = @TenantId AND GroupName = 'Sport Collection';

-- Genders
DECLARE @GenderMenId   UNIQUEIDENTIFIER;
DECLARE @GenderWomenId UNIQUEIDENTIFIER;
DECLARE @GenderUnisexId UNIQUEIDENTIFIER;
SELECT @GenderMenId    = GenderId FROM master.Genders WHERE TenantId = @TenantId AND GenderName = 'Men';
SELECT @GenderWomenId  = GenderId FROM master.Genders WHERE TenantId = @TenantId AND GenderName = 'Women';
SELECT @GenderUnisexId = GenderId FROM master.Genders WHERE TenantId = @TenantId AND GenderName = 'Unisex';

-- Seasons
DECLARE @SeasonAW25Id UNIQUEIDENTIFIER;
DECLARE @SeasonSS25Id UNIQUEIDENTIFIER;
SELECT @SeasonAW25Id = SeasonId FROM master.Seasons WHERE TenantId = @TenantId AND SeasonCode = 'AW25';
SELECT @SeasonSS25Id = SeasonId FROM master.Seasons WHERE TenantId = @TenantId AND SeasonCode = 'SS25';

PRINT 'Section 0: Parent IDs resolved.';
GO

-- ============================================================
-- SECTION 1 - RolePermissions
-- Assign all permissions to roles with appropriate access
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId UNIQUEIDENTIFIER;
SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';

DECLARE @AdminRoleId    UNIQUEIDENTIFIER;
DECLARE @ManagerRoleId  UNIQUEIDENTIFIER;
DECLARE @AccountsRoleId UNIQUEIDENTIFIER;
DECLARE @ViewerRoleId   UNIQUEIDENTIFIER;
SELECT @AdminRoleId    = RoleId FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Admin';
SELECT @ManagerRoleId  = RoleId FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Storemanager';
SELECT @AccountsRoleId = RoleId FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Accountuser';
SELECT @ViewerRoleId   = RoleId FROM auth.Roles WHERE TenantId = @TenantId AND RoleName = 'Viewer';

-- Admin: full access to everything
INSERT INTO auth.RolePermissions (RoleId, PermissionId, CanView, CanAdd, CanEdit, CanDelete)
SELECT @AdminRoleId, PermissionId, 1, 1, 1, 1
FROM auth.Permissions
WHERE NOT EXISTS (
    SELECT 1 FROM auth.RolePermissions rp
    WHERE rp.RoleId = @AdminRoleId AND rp.PermissionId = auth.Permissions.PermissionId
);

-- Storemanager: full CRUD except Users/Roles/Audit (view-only) and no delete on Billing
INSERT INTO auth.RolePermissions (RoleId, PermissionId, CanView, CanAdd, CanEdit, CanDelete)
SELECT
    @ManagerRoleId,
    p.PermissionId,
    1,  -- CanView always
    CASE WHEN p.Module IN ('Users','Roles','Audit') THEN 0 ELSE 1 END,
    CASE WHEN p.Module IN ('Users','Roles','Audit') THEN 0 ELSE 1 END,
    CASE WHEN p.Module IN ('Users','Roles','Audit','Billing') THEN 0 ELSE 1 END
FROM auth.Permissions p
WHERE NOT EXISTS (
    SELECT 1 FROM auth.RolePermissions rp
    WHERE rp.RoleId = @ManagerRoleId AND rp.PermissionId = p.PermissionId
);

-- Accountuser: Billing/Orders/Clients/Reports full CRUD; Inventory/Stock view+add; rest view-only
INSERT INTO auth.RolePermissions (RoleId, PermissionId, CanView, CanAdd, CanEdit, CanDelete)
SELECT
    @AccountsRoleId,
    p.PermissionId,
    1,
    CASE WHEN p.Module IN ('Billing','Orders','Clients','Stores','Receipt','Dispatch','Returns','Reports','Analytics') THEN 1 ELSE 0 END,
    CASE WHEN p.Module IN ('Billing','Orders','Clients','Stores','Receipt','Dispatch','Returns') THEN 1 ELSE 0 END,
    CASE WHEN p.Module IN ('Billing','Orders') THEN 1 ELSE 0 END
FROM auth.Permissions p
WHERE NOT EXISTS (
    SELECT 1 FROM auth.RolePermissions rp
    WHERE rp.RoleId = @AccountsRoleId AND rp.PermissionId = p.PermissionId
);

-- Viewer: view-only on everything
INSERT INTO auth.RolePermissions (RoleId, PermissionId, CanView, CanAdd, CanEdit, CanDelete)
SELECT @ViewerRoleId, PermissionId, 1, 0, 0, 0
FROM auth.Permissions
WHERE NOT EXISTS (
    SELECT 1 FROM auth.RolePermissions rp
    WHERE rp.RoleId = @ViewerRoleId AND rp.PermissionId = auth.Permissions.PermissionId
);

PRINT 'Section 1: RolePermissions seeded.';
GO

-- ============================================================
-- SECTION 2 - Sub-Segments & Sub-Categories
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId       UNIQUEIDENTIFIER;
DECLARE @SegFootwearId  UNIQUEIDENTIFIER;
DECLARE @SegLeatherId   UNIQUEIDENTIFIER;
DECLARE @CatShoesId     UNIQUEIDENTIFIER;
DECLARE @CatBagsId      UNIQUEIDENTIFIER;
DECLARE @CatBeltsId     UNIQUEIDENTIFIER;
SELECT @TenantId       = TenantId   FROM auth.Tenants    WHERE TenantCode = 'ELCURIO';
SELECT @SegFootwearId  = SegmentId  FROM master.Segments WHERE TenantId = @TenantId AND SegmentName = 'Footwear';
SELECT @SegLeatherId   = SegmentId  FROM master.Segments WHERE TenantId = @TenantId AND SegmentName = 'Leather Goods';
SELECT @CatShoesId     = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Shoes';
SELECT @CatBagsId      = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Bags';
SELECT @CatBeltsId     = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Belts';

-- SubSegments
INSERT INTO master.SubSegments (TenantId, SegmentId, SubSegmentName)
SELECT s.TenantId, s.SegmentId, s.SubSegmentName FROM (VALUES
    (@TenantId, @SegFootwearId, 'Formal'),
    (@TenantId, @SegFootwearId, 'Casual'),
    (@TenantId, @SegFootwearId, 'Sports'),
    (@TenantId, @SegFootwearId, 'Ethnic'),
    (@TenantId, @SegLeatherId, 'Handbags'),
    (@TenantId, @SegLeatherId, 'Wallets'),
    (@TenantId, @SegLeatherId, 'Accessories')
) AS s(TenantId, SegmentId, SubSegmentName)
WHERE NOT EXISTS (
    SELECT 1 FROM master.SubSegments x
    WHERE x.SegmentId = s.SegmentId AND x.SubSegmentName = s.SubSegmentName
);

-- SubCategories under Shoes
INSERT INTO master.SubCategories (TenantId, CategoryId, SubCategoryName)
SELECT s.TenantId, s.CategoryId, s.SubCategoryName FROM (VALUES
    (@TenantId, @CatShoesId, 'Derby'),
    (@TenantId, @CatShoesId, 'Oxford'),
    (@TenantId, @CatShoesId, 'Loafer'),
    (@TenantId, @CatShoesId, 'Sneaker'),
    (@TenantId, @CatShoesId, 'Sandal'),
    (@TenantId, @CatShoesId, 'Boot'),
    (@TenantId, @CatBagsId,  'Tote'),
    (@TenantId, @CatBagsId,  'Clutch'),
    (@TenantId, @CatBagsId,  'Backpack'),
    (@TenantId, @CatBagsId,  'Briefcase'),
    (@TenantId, @CatBeltsId, 'Formal Belt'),
    (@TenantId, @CatBeltsId, 'Casual Belt')
) AS s(TenantId, CategoryId, SubCategoryName)
WHERE NOT EXISTS (
    SELECT 1 FROM master.SubCategories x
    WHERE x.CategoryId = s.CategoryId AND x.SubCategoryName = s.SubCategoryName
);

-- Colors
INSERT INTO master.Colors (TenantId, ColorName, ColorCode)
SELECT s.TenantId, s.ColorName, s.ColorCode FROM (VALUES
    (@TenantId, 'Black',    '#000000'),
    (@TenantId, 'Brown',    '#7B3F00'),
    (@TenantId, 'Tan',      '#D2B48C'),
    (@TenantId, 'Navy',     '#001F5B'),
    (@TenantId, 'White',    '#FFFFFF'),
    (@TenantId, 'Grey',     '#808080'),
    (@TenantId, 'Burgundy', '#800020'),
    (@TenantId, 'Cognac',   '#9A4722'),
    (@TenantId, 'Olive',    '#556B2F')
) AS s(TenantId, ColorName, ColorCode)
WHERE NOT EXISTS (
    SELECT 1 FROM master.Colors x
    WHERE x.TenantId = s.TenantId AND x.ColorName = s.ColorName
);

-- Styles
INSERT INTO master.Styles (TenantId, StyleName)
SELECT s.TenantId, s.StyleName FROM (VALUES
    (@TenantId, 'Formal'),
    (@TenantId, 'Casual'),
    (@TenantId, 'Semi-Formal'),
    (@TenantId, 'Sports'),
    (@TenantId, 'Ethnic')
) AS s(TenantId, StyleName)
WHERE NOT EXISTS (
    SELECT 1 FROM master.Styles x
    WHERE x.TenantId = s.TenantId AND x.StyleName = s.StyleName
);

-- Fasteners
INSERT INTO master.Fasteners (TenantId, FastenerName)
SELECT s.TenantId, s.FastenerName FROM (VALUES
    (@TenantId, 'Lace-Up'),
    (@TenantId, 'Slip-On'),
    (@TenantId, 'Velcro'),
    (@TenantId, 'Buckle'),
    (@TenantId, 'Zip'),
    (@TenantId, 'Chelsea'),
    (@TenantId, 'Hook & Loop')
) AS s(TenantId, FastenerName)
WHERE NOT EXISTS (
    SELECT 1 FROM master.Fasteners x
    WHERE x.TenantId = s.TenantId AND x.FastenerName = s.FastenerName
);

PRINT 'Section 2: SubSegments, SubCategories, Colors, Styles, Fasteners seeded.';
GO

-- ============================================================
-- SECTION 3 - Size Charts
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId     UNIQUEIDENTIFIER;
DECLARE @GenderMenId  UNIQUEIDENTIFIER;
DECLARE @GenderWomenId UNIQUEIDENTIFIER;
SELECT @TenantId      = TenantId  FROM auth.Tenants      WHERE TenantCode = 'ELCURIO';
SELECT @GenderMenId   = GenderId  FROM master.Genders    WHERE TenantId = @TenantId AND GenderName = 'Men';
SELECT @GenderWomenId = GenderId  FROM master.Genders    WHERE TenantId = @TenantId AND GenderName = 'Women';

-- Men's footwear sizes EUR 39-46
INSERT INTO master.SizeCharts (TenantId, ChartType, GenderId, AgeGroup, USSize, EuroSize, UKSize, IndSize, CM)
SELECT s.TenantId, s.ChartType, s.GenderId, s.AgeGroup, s.USSize, s.EuroSize, s.UKSize, s.IndSize, s.CM
FROM (VALUES
    (@TenantId,'Footwear',@GenderMenId,'Adult', 6.5,  39, 6.0,  6.0,  24.8),
    (@TenantId,'Footwear',@GenderMenId,'Adult', 7.0,  40, 6.5,  6.5,  25.4),
    (@TenantId,'Footwear',@GenderMenId,'Adult', 7.5,  41, 7.0,  7.0,  26.0),
    (@TenantId,'Footwear',@GenderMenId,'Adult', 8.0,  42, 7.5,  7.5,  26.7),
    (@TenantId,'Footwear',@GenderMenId,'Adult', 8.5,  43, 8.0,  8.0,  27.3),
    (@TenantId,'Footwear',@GenderMenId,'Adult', 9.5,  44, 9.0,  9.0,  28.0),
    (@TenantId,'Footwear',@GenderMenId,'Adult',10.5,  45,10.0, 10.0,  28.6),
    (@TenantId,'Footwear',@GenderMenId,'Adult',11.5,  46,11.0, 11.0,  29.2)
) AS s(TenantId,ChartType,GenderId,AgeGroup,USSize,EuroSize,UKSize,IndSize,CM)
WHERE NOT EXISTS (
    SELECT 1 FROM master.SizeCharts x
    WHERE x.TenantId = s.TenantId AND x.GenderId = s.GenderId AND x.EuroSize = s.EuroSize AND x.ChartType = s.ChartType
);

-- Women's footwear sizes EUR 35-41
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
WHERE NOT EXISTS (
    SELECT 1 FROM master.SizeCharts x
    WHERE x.TenantId = s.TenantId AND x.GenderId = s.GenderId AND x.EuroSize = s.EuroSize AND x.ChartType = s.ChartType
);

PRINT 'Section 3: SizeCharts seeded.';
GO

-- ============================================================
-- SECTION 4 - Articles (Footwear + Leather Goods)
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId      UNIQUEIDENTIFIER;
SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';

DECLARE @BrandClassicStep UNIQUEIDENTIFIER; SELECT @BrandClassicStep = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'ClassicStep';
DECLARE @BrandRunFast     UNIQUEIDENTIFIER; SELECT @BrandRunFast     = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'RunFast';
DECLARE @BrandUrbanStep   UNIQUEIDENTIFIER; SELECT @BrandUrbanStep   = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'UrbanStep';
DECLARE @BrandBagCraft    UNIQUEIDENTIFIER; SELECT @BrandBagCraft    = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'BagCraft';
DECLARE @BrandBeltKing    UNIQUEIDENTIFIER; SELECT @BrandBeltKing    = BrandId FROM master.Brands WHERE TenantId = @TenantId AND BrandName = 'BeltKing';
DECLARE @SegFW  UNIQUEIDENTIFIER; SELECT @SegFW  = SegmentId  FROM master.Segments   WHERE TenantId = @TenantId AND SegmentName = 'Footwear';
DECLARE @SegLG  UNIQUEIDENTIFIER; SELECT @SegLG  = SegmentId  FROM master.Segments   WHERE TenantId = @TenantId AND SegmentName = 'Leather Goods';
DECLARE @CatSh  UNIQUEIDENTIFIER; SELECT @CatSh  = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Shoes';
DECLARE @CatBg  UNIQUEIDENTIFIER; SELECT @CatBg  = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Bags';
DECLARE @CatBlt UNIQUEIDENTIFIER; SELECT @CatBlt = CategoryId FROM master.Categories WHERE TenantId = @TenantId AND CategoryName = 'Belts';
DECLARE @GrpCL  UNIQUEIDENTIFIER; SELECT @GrpCL  = GroupId    FROM master.Groups     WHERE TenantId = @TenantId AND GroupName = 'Classic Collection';
DECLARE @GrpUB  UNIQUEIDENTIFIER; SELECT @GrpUB  = GroupId    FROM master.Groups     WHERE TenantId = @TenantId AND GroupName = 'Urban Collection';
DECLARE @GrpEX  UNIQUEIDENTIFIER; SELECT @GrpEX  = GroupId    FROM master.Groups     WHERE TenantId = @TenantId AND GroupName = 'Executive Collection';
DECLARE @GrpSP  UNIQUEIDENTIFIER; SELECT @GrpSP  = GroupId    FROM master.Groups     WHERE TenantId = @TenantId AND GroupName = 'Sport Collection';
DECLARE @GenM   UNIQUEIDENTIFIER; SELECT @GenM   = GenderId   FROM master.Genders    WHERE TenantId = @TenantId AND GenderName = 'Men';
DECLARE @GenW   UNIQUEIDENTIFIER; SELECT @GenW   = GenderId   FROM master.Genders    WHERE TenantId = @TenantId AND GenderName = 'Women';
DECLARE @GenU   UNIQUEIDENTIFIER; SELECT @GenU   = GenderId   FROM master.Genders    WHERE TenantId = @TenantId AND GenderName = 'Unisex';
DECLARE @SeaAW25 UNIQUEIDENTIFIER; SELECT @SeaAW25 = SeasonId FROM master.Seasons    WHERE TenantId = @TenantId AND SeasonCode = 'AW25';
DECLARE @SeaSS25 UNIQUEIDENTIFIER; SELECT @SeaSS25 = SeasonId FROM master.Seasons    WHERE TenantId = @TenantId AND SeasonCode = 'SS25';

DECLARE @SubCatDerby     UNIQUEIDENTIFIER; SELECT @SubCatDerby     = SubCategoryId FROM master.SubCategories WHERE CategoryId = @CatSh AND SubCategoryName = 'Derby';
DECLARE @SubCatOxford    UNIQUEIDENTIFIER; SELECT @SubCatOxford    = SubCategoryId FROM master.SubCategories WHERE CategoryId = @CatSh AND SubCategoryName = 'Oxford';
DECLARE @SubCatLoafer    UNIQUEIDENTIFIER; SELECT @SubCatLoafer    = SubCategoryId FROM master.SubCategories WHERE CategoryId = @CatSh AND SubCategoryName = 'Loafer';
DECLARE @SubCatSneaker   UNIQUEIDENTIFIER; SELECT @SubCatSneaker   = SubCategoryId FROM master.SubCategories WHERE CategoryId = @CatSh AND SubCategoryName = 'Sneaker';
DECLARE @SubCatTote      UNIQUEIDENTIFIER; SELECT @SubCatTote      = SubCategoryId FROM master.SubCategories WHERE CategoryId = @CatBg AND SubCategoryName = 'Tote';
DECLARE @SubCatBriefcase UNIQUEIDENTIFIER; SELECT @SubCatBriefcase = SubCategoryId FROM master.SubCategories WHERE CategoryId = @CatBg AND SubCategoryName = 'Briefcase';
DECLARE @SubCatFormalBelt UNIQUEIDENTIFIER; SELECT @SubCatFormalBelt = SubCategoryId FROM master.SubCategories WHERE CategoryId = @CatBlt AND SubCategoryName = 'Formal Belt';
DECLARE @SubSegFormal    UNIQUEIDENTIFIER; SELECT @SubSegFormal    = SubSegmentId FROM master.SubSegments WHERE SegmentId = @SegFW AND SubSegmentName = 'Formal';
DECLARE @SubSegCasual    UNIQUEIDENTIFIER; SELECT @SubSegCasual    = SubSegmentId FROM master.SubSegments WHERE SegmentId = @SegFW AND SubSegmentName = 'Casual';
DECLARE @SubSegSports    UNIQUEIDENTIFIER; SELECT @SubSegSports    = SubSegmentId FROM master.SubSegments WHERE SegmentId = @SegFW AND SubSegmentName = 'Sports';
DECLARE @SubSegHandbags  UNIQUEIDENTIFIER; SELECT @SubSegHandbags  = SubSegmentId FROM master.SubSegments WHERE SegmentId = @SegLG AND SubSegmentName = 'Handbags';
DECLARE @SubSegAccessory UNIQUEIDENTIFIER; SELECT @SubSegAccessory = SubSegmentId FROM master.SubSegments WHERE SegmentId = @SegLG AND SubSegmentName = 'Accessories';

-- Footwear Articles
IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-001')
INSERT INTO product.Articles (TenantId, ArticleCode, ArticleName, BrandId, SegmentId, SubSegmentId, CategoryId, SubCategoryId, GroupId, SeasonId, GenderId, Color, Style, Fastener, HSNCode, UOM, MRP, CBD, IsSizeBased, LaunchDate)
VALUES (@TenantId,'CS-DRB-001','ClassicStep Executive Derby - Black',@BrandClassicStep,@SegFW,@SubSegFormal,@CatSh,@SubCatDerby,@GrpEX,@SeaAW25,@GenM,'Black','Formal','Lace-Up','64039990','PAIRS',3995.00,2200.00,1,'2025-09-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-002')
INSERT INTO product.Articles (TenantId, ArticleCode, ArticleName, BrandId, SegmentId, SubSegmentId, CategoryId, SubCategoryId, GroupId, SeasonId, GenderId, Color, Style, Fastener, HSNCode, UOM, MRP, CBD, IsSizeBased, LaunchDate)
VALUES (@TenantId,'CS-DRB-002','ClassicStep Executive Derby - Brown',@BrandClassicStep,@SegFW,@SubSegFormal,@CatSh,@SubCatDerby,@GrpEX,@SeaAW25,@GenM,'Brown','Formal','Lace-Up','64039990','PAIRS',3995.00,2200.00,1,'2025-09-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-OXF-001')
INSERT INTO product.Articles (TenantId, ArticleCode, ArticleName, BrandId, SegmentId, SubSegmentId, CategoryId, SubCategoryId, GroupId, SeasonId, GenderId, Color, Style, Fastener, HSNCode, UOM, MRP, CBD, IsSizeBased, LaunchDate)
VALUES (@TenantId,'CS-OXF-001','ClassicStep Classic Oxford - Black',@BrandClassicStep,@SegFW,@SubSegFormal,@CatSh,@SubCatOxford,@GrpCL,@SeaAW25,@GenM,'Black','Formal','Lace-Up','64039990','PAIRS',4495.00,2500.00,1,'2025-09-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'US-LOA-001')
INSERT INTO product.Articles (TenantId, ArticleCode, ArticleName, BrandId, SegmentId, SubSegmentId, CategoryId, SubCategoryId, GroupId, SeasonId, GenderId, Color, Style, Fastener, HSNCode, UOM, MRP, CBD, IsSizeBased, LaunchDate)
VALUES (@TenantId,'US-LOA-001','UrbanStep Casual Loafer - Tan',@BrandUrbanStep,@SegFW,@SubSegCasual,@CatSh,@SubCatLoafer,@GrpUB,@SeaSS25,@GenM,'Tan','Casual','Slip-On','64039990','PAIRS',2995.00,1600.00,1,'2025-03-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'US-LOA-002')
INSERT INTO product.Articles (TenantId, ArticleCode, ArticleName, BrandId, SegmentId, SubSegmentId, CategoryId, SubCategoryId, GroupId, SeasonId, GenderId, Color, Style, Fastener, HSNCode, UOM, MRP, CBD, IsSizeBased, LaunchDate)
VALUES (@TenantId,'US-LOA-002','UrbanStep Casual Loafer - Navy',@BrandUrbanStep,@SegFW,@SubSegCasual,@CatSh,@SubCatLoafer,@GrpUB,@SeaSS25,@GenW,'Navy','Casual','Slip-On','64039990','PAIRS',2795.00,1500.00,1,'2025-03-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-001')
INSERT INTO product.Articles (TenantId, ArticleCode, ArticleName, BrandId, SegmentId, SubSegmentId, CategoryId, SubCategoryId, GroupId, SeasonId, GenderId, Color, Style, Fastener, HSNCode, UOM, MRP, CBD, IsSizeBased, LaunchDate)
VALUES (@TenantId,'RF-SNK-001','RunFast Sport Sneaker - White',@BrandRunFast,@SegFW,@SubSegSports,@CatSh,@SubCatSneaker,@GrpSP,@SeaSS25,@GenU,'White','Sports','Lace-Up','64041990','PAIRS',3495.00,1800.00,1,'2025-03-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-002')
INSERT INTO product.Articles (TenantId, ArticleCode, ArticleName, BrandId, SegmentId, SubSegmentId, CategoryId, SubCategoryId, GroupId, SeasonId, GenderId, Color, Style, Fastener, HSNCode, UOM, MRP, CBD, IsSizeBased, LaunchDate)
VALUES (@TenantId,'RF-SNK-002','RunFast Sport Sneaker - Black',@BrandRunFast,@SegFW,@SubSegSports,@CatSh,@SubCatSneaker,@GrpSP,@SeaSS25,@GenU,'Black','Sports','Lace-Up','64041990','PAIRS',3495.00,1800.00,1,'2025-03-01');

-- Leather Goods Articles
IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'BC-TOT-001')
INSERT INTO product.Articles (TenantId, ArticleCode, ArticleName, BrandId, SegmentId, SubSegmentId, CategoryId, SubCategoryId, GroupId, SeasonId, GenderId, Color, Style, Fastener, HSNCode, UOM, MRP, CBD, IsSizeBased, LaunchDate)
VALUES (@TenantId,'BC-TOT-001','BagCraft Executive Tote - Black',@BrandBagCraft,@SegLG,@SubSegHandbags,@CatBg,@SubCatTote,@GrpEX,@SeaAW25,@GenW,'Black','Formal','Zip','42021290','PCS',5995.00,3200.00,0,'2025-09-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'BC-BRF-001')
INSERT INTO product.Articles (TenantId, ArticleCode, ArticleName, BrandId, SegmentId, SubSegmentId, CategoryId, SubCategoryId, GroupId, SeasonId, GenderId, Color, Style, Fastener, HSNCode, UOM, MRP, CBD, IsSizeBased, LaunchDate)
VALUES (@TenantId,'BC-BRF-001','BagCraft Leather Briefcase - Brown',@BrandBagCraft,@SegLG,@SubSegHandbags,@CatBg,@SubCatBriefcase,@GrpEX,@SeaAW25,@GenM,'Brown','Formal','Buckle','42021290','PCS',7995.00,4200.00,0,'2025-09-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'BK-BLT-001')
INSERT INTO product.Articles (TenantId, ArticleCode, ArticleName, BrandId, SegmentId, SubSegmentId, CategoryId, SubCategoryId, GroupId, SeasonId, GenderId, Color, Style, Fastener, HSNCode, UOM, MRP, CBD, IsSizeBased, LaunchDate)
VALUES (@TenantId,'BK-BLT-001','BeltKing Formal Leather Belt - Black',@BrandBeltKing,@SegLG,@SubSegAccessory,@CatBlt,@SubCatFormalBelt,@GrpCL,@SeaAW25,@GenM,'Black','Formal','Buckle','42033000','PCS',1295.00,650.00,0,'2025-09-01');

IF NOT EXISTS (SELECT 1 FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'BK-BLT-002')
INSERT INTO product.Articles (TenantId, ArticleCode, ArticleName, BrandId, SegmentId, SubSegmentId, CategoryId, SubCategoryId, GroupId, SeasonId, GenderId, Color, Style, Fastener, HSNCode, UOM, MRP, CBD, IsSizeBased, LaunchDate)
VALUES (@TenantId,'BK-BLT-002','BeltKing Formal Leather Belt - Brown',@BrandBeltKing,@SegLG,@SubSegAccessory,@CatBlt,@SubCatFormalBelt,@GrpCL,@SeaAW25,@GenM,'Brown','Formal','Buckle','42033000','PCS',1295.00,650.00,0,'2025-09-01');

PRINT 'Section 4: Articles seeded.';
GO

-- ============================================================
-- SECTION 5 - FootwearDetails, LeatherGoodsDetails, ArticleSizes
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId UNIQUEIDENTIFIER;
SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';

-- FootwearDetails for all footwear articles
DECLARE @ArtId UNIQUEIDENTIFIER;

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-001';
IF NOT EXISTS (SELECT 1 FROM product.FootwearDetails WHERE ArticleId = @ArtId)
INSERT INTO product.FootwearDetails (ArticleId, Last, UpperLeather, LiningLeather, Sole, SizeRunFrom, SizeRunTo)
VALUES (@ArtId, '806', 'Full Grain Cow Leather', 'Pig Leather Lining', 'TPR Sole', 39, 46);

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-002';
IF NOT EXISTS (SELECT 1 FROM product.FootwearDetails WHERE ArticleId = @ArtId)
INSERT INTO product.FootwearDetails (ArticleId, Last, UpperLeather, LiningLeather, Sole, SizeRunFrom, SizeRunTo)
VALUES (@ArtId, '806', 'Full Grain Cow Leather', 'Pig Leather Lining', 'TPR Sole', 39, 46);

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-OXF-001';
IF NOT EXISTS (SELECT 1 FROM product.FootwearDetails WHERE ArticleId = @ArtId)
INSERT INTO product.FootwearDetails (ArticleId, Last, UpperLeather, LiningLeather, Sole, SizeRunFrom, SizeRunTo)
VALUES (@ArtId, '904', 'Full Grain Cow Leather', 'Soft Leather Lining', 'Leather Sole', 39, 46);

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'US-LOA-001';
IF NOT EXISTS (SELECT 1 FROM product.FootwearDetails WHERE ArticleId = @ArtId)
INSERT INTO product.FootwearDetails (ArticleId, Last, UpperLeather, LiningLeather, Sole, SizeRunFrom, SizeRunTo)
VALUES (@ArtId, '702', 'Nubuck Leather', 'Mesh Lining', 'Rubber Sole', 39, 46);

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'US-LOA-002';
IF NOT EXISTS (SELECT 1 FROM product.FootwearDetails WHERE ArticleId = @ArtId)
INSERT INTO product.FootwearDetails (ArticleId, Last, UpperLeather, LiningLeather, Sole, SizeRunFrom, SizeRunTo)
VALUES (@ArtId, '702', 'Nubuck Leather', 'Mesh Lining', 'Rubber Sole', 35, 41);

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-001';
IF NOT EXISTS (SELECT 1 FROM product.FootwearDetails WHERE ArticleId = @ArtId)
INSERT INTO product.FootwearDetails (ArticleId, Last, UpperLeather, LiningLeather, Sole, SizeRunFrom, SizeRunTo)
VALUES (@ArtId, '501', 'Synthetic Upper', 'Mesh Lining', 'EVA+Rubber Sole', 39, 46);

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-002';
IF NOT EXISTS (SELECT 1 FROM product.FootwearDetails WHERE ArticleId = @ArtId)
INSERT INTO product.FootwearDetails (ArticleId, Last, UpperLeather, LiningLeather, Sole, SizeRunFrom, SizeRunTo)
VALUES (@ArtId, '501', 'Synthetic Upper', 'Mesh Lining', 'EVA+Rubber Sole', 39, 46);

-- LeatherGoodsDetails
SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'BC-TOT-001';
IF NOT EXISTS (SELECT 1 FROM product.LeatherGoodsDetails WHERE ArticleId = @ArtId)
INSERT INTO product.LeatherGoodsDetails (ArticleId, Dimensions, Security)
VALUES (@ArtId, '40cm x 30cm x 12cm', 'Metal Zip + Magnetic Clasp');

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'BC-BRF-001';
IF NOT EXISTS (SELECT 1 FROM product.LeatherGoodsDetails WHERE ArticleId = @ArtId)
INSERT INTO product.LeatherGoodsDetails (ArticleId, Dimensions, Security)
VALUES (@ArtId, '45cm x 32cm x 10cm', 'Combination Lock + Zip');

-- ArticleSizes: Men's footwear EUR 39-46 for CS-DRB-001, CS-DRB-002, CS-OXF-001, US-LOA-001, RF-SNK-001, RF-SNK-002
DECLARE @SizeData TABLE (EuroSize INT, UKSize DECIMAL(5,1), USSize DECIMAL(5,1));
INSERT INTO @SizeData VALUES (39,6.0,6.5),(40,6.5,7.0),(41,7.0,7.5),(42,7.5,8.0),(43,8.0,8.5),(44,9.0,9.5),(45,10.0,10.5),(46,11.0,11.5);

DECLARE @MenArticles TABLE (ArticleCode NVARCHAR(50));
INSERT INTO @MenArticles VALUES ('CS-DRB-001'),('CS-DRB-002'),('CS-OXF-001'),('US-LOA-001'),('RF-SNK-001'),('RF-SNK-002');

INSERT INTO product.ArticleSizes (ArticleId, EuroSize, UKSize, USSize, MRP)
SELECT a.ArticleId, s.EuroSize, s.UKSize, s.USSize, a.MRP
FROM product.Articles a
CROSS JOIN @SizeData s
INNER JOIN @MenArticles ma ON ma.ArticleCode = a.ArticleCode
WHERE a.TenantId = @TenantId
AND NOT EXISTS (
    SELECT 1 FROM product.ArticleSizes x
    WHERE x.ArticleId = a.ArticleId AND x.EuroSize = s.EuroSize
);

-- Women's loafer EUR 35-41
DECLARE @WomenSizeData TABLE (EuroSize INT, UKSize DECIMAL(5,1), USSize DECIMAL(5,1));
INSERT INTO @WomenSizeData VALUES (35,2.5,5.0),(36,3.0,5.5),(37,4.0,6.0),(38,4.5,6.5),(39,5.5,7.5),(40,6.5,8.5),(41,7.5,9.5);

SELECT @ArtId = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'US-LOA-002';
INSERT INTO product.ArticleSizes (ArticleId, EuroSize, UKSize, USSize, MRP)
SELECT @ArtId, s.EuroSize, s.UKSize, s.USSize, 2795.00
FROM @WomenSizeData s
WHERE NOT EXISTS (
    SELECT 1 FROM product.ArticleSizes x
    WHERE x.ArticleId = @ArtId AND x.EuroSize = s.EuroSize
);

PRINT 'Section 5: FootwearDetails, LeatherGoodsDetails, ArticleSizes seeded.';
GO

-- ============================================================
-- SECTION 6 - Clients & Stores
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId UNIQUEIDENTIFIER;
SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';

-- Clients
DECLARE @ClientData TABLE (
    ClientCode  NVARCHAR(50),
    ClientName  NVARCHAR(300),
    Org         NVARCHAR(300),
    GSTIN       NVARCHAR(15),
    StateId     INT,
    StateCode   NVARCHAR(5),
    Zone        NVARCHAR(20),
    Email       NVARCHAR(200),
    ContactNo   NVARCHAR(20),
    Margin      DECIMAL(5,2)
);
INSERT INTO @ClientData VALUES
('CLT-001','VISION FOOTWEAR','Vision Retail Pvt Ltd','27ABCPV1234A1Z1',27,'27','WEST','vision@retail.com','9811001001',30.00),
('CLT-002','METRO SHOES','Metro Brands Ltd','29AAAMB5678B1Z2',29,'29','SOUTH','metro@brands.com','9822002002',28.00),
('CLT-003','LIBERTY SHOES','Liberty Shoes Ltd','07AALCL3456C1Z3',7,'07','NORTH','liberty@shoes.in','9833003003',25.00),
('CLT-004','BEST WALK','Best Walk Retail LLP','33AACFB7890D1Z4',33,'33','SOUTH','bestwalk@retail.in','9844004004',27.00),
('CLT-005','EAST INDIA FOOTWEAR','East India Footwear Co','19AADFE2345E1Z5',19,'19','EAST','eifw@gmail.com','9855005005',22.00);

INSERT INTO sales.Clients (TenantId, ClientCode, ClientName, Organisation, GSTIN, StateId, StateCode, Zone, Email, ContactNo, MarginPercent, MarginType)
SELECT @TenantId, d.ClientCode, d.ClientName, d.Org, d.GSTIN, d.StateId, d.StateCode, d.Zone, d.Email, d.ContactNo, d.Margin, 'NET OF TAXES'
FROM @ClientData d
WHERE NOT EXISTS (
    SELECT 1 FROM sales.Clients c WHERE c.TenantId = @TenantId AND c.ClientCode = d.ClientCode
);

-- Stores per client
DECLARE @CLT001 UNIQUEIDENTIFIER; SELECT @CLT001 = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-001';
DECLARE @CLT002 UNIQUEIDENTIFIER; SELECT @CLT002 = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-002';
DECLARE @CLT003 UNIQUEIDENTIFIER; SELECT @CLT003 = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-003';
DECLARE @CLT004 UNIQUEIDENTIFIER; SELECT @CLT004 = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-004';
DECLARE @CLT005 UNIQUEIDENTIFIER; SELECT @CLT005 = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-005';

DECLARE @StoreData TABLE (
    ClientId    UNIQUEIDENTIFIER,
    StoreCode   NVARCHAR(50),
    StoreName   NVARCHAR(300),
    Format      NVARCHAR(50),
    City        NVARCHAR(100),
    State       NVARCHAR(100),
    Channel     NVARCHAR(50),
    MO          NVARCHAR(10),
    Margin      DECIMAL(5,2),
    Manager     NVARCHAR(200),
    GSTIN       NVARCHAR(15)
);
INSERT INTO @StoreData VALUES
(@CLT001,'STR-001-MBD','Vision - Malad Mumbai','RETAIL_MALL','Mumbai','Maharashtra','MBO','SOR',30.00,'Ravi Verma','27ABCPV1234A1Z1'),
(@CLT001,'STR-001-PNE','Vision - FC Road Pune','RETAIL_HIGH_STREET','Pune','Maharashtra','MBO','SOR',30.00,'Pooja Nair','27ABCPV1234A2Z1'),
(@CLT002,'STR-002-BLR','Metro - Orion Mall Bangalore','RETAIL_MALL','Bangalore','Karnataka','MBO','OUT_MKT',28.00,'Suresh Kumar','29AAAMB5678B1Z2'),
(@CLT002,'STR-002-CHN','Metro - Express Avenue Chennai','RETAIL_MALL','Chennai','Tamil Nadu','MBO','OUT_MKT',28.00,'Preethi Raj','33AAAMB5678B2Z2'),
(@CLT003,'STR-003-DLH','Liberty - CP Delhi','RETAIL_HIGH_STREET','New Delhi','Delhi','EBO','OUT_MKT',25.00,'Vikram Singh','07AALCL3456C1Z3'),
(@CLT004,'STR-004-CHN','BestWalk - Anna Nagar Chennai','RETAIL_HIGH_STREET','Chennai','Tamil Nadu','MBO','SOR',27.00,'Anand Raj','33AACFB7890D1Z4'),
(@CLT005,'STR-005-KOL','EIF - Park Street Kolkata','RETAIL_HIGH_STREET','Kolkata','West Bengal','EBO','SOR',22.00,'Saurav Das','19AADFE2345E1Z5');

INSERT INTO sales.Stores (TenantId, ClientId, StoreCode, StoreName, Format, City, State, Channel, ModusOperandi, MarginPercent, MarginType, ManagerName, GSTIN)
SELECT @TenantId, d.ClientId, d.StoreCode, d.StoreName, d.Format, d.City, d.State, d.Channel, d.MO, d.Margin, 'NET OF TAXES', d.Manager, d.GSTIN
FROM @StoreData d
WHERE NOT EXISTS (
    SELECT 1 FROM sales.Stores s WHERE s.TenantId = @TenantId AND s.StoreCode = d.StoreCode
);

PRINT 'Section 6: Clients and Stores seeded.';
GO

-- ============================================================
-- SECTION 7 - CustomerMasterEntries
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId UNIQUEIDENTIFIER;
SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';

INSERT INTO sales.CustomerMasterEntries
    (TenantId, StoreId, ClientId, EntryDate, StoreCode, Organisation,
     BillingAddress1, BillingAddress2, BillingCity, BillingPinCode, BillingState, BillingStateCode, BillingZone,
     BillingNumber, SameAsBilling,
     ShippingAddress1, ShippingCity, ShippingPinCode, ShippingState, ShippingStateCode, ShippingZone,
     ContactName, ContactNo, Email, StoreManager,
     GSTIN, BusinessChannel, BusinessModule, MarginPercent, MarginType)
SELECT
    @TenantId, s.StoreId, s.ClientId, CAST('2025-01-01' AS DATE), s.StoreCode, s.StoreName,
    s.StoreName, s.City, s.City, '400001', s.State,
    CASE s.State WHEN 'Maharashtra' THEN '27' WHEN 'Karnataka' THEN '29' WHEN 'Delhi' THEN '07'
                 WHEN 'Tamil Nadu' THEN '33' WHEN 'West Bengal' THEN '19' ELSE '00' END,
    CASE s.State WHEN 'Maharashtra' THEN 'WEST' WHEN 'Karnataka' THEN 'SOUTH'
                 WHEN 'Delhi' THEN 'NORTH' WHEN 'Tamil Nadu' THEN 'SOUTH'
                 WHEN 'West Bengal' THEN 'EAST' ELSE 'NORTH' END,
    '022-12345678', 1,
    s.StoreName, s.City, '400001', s.State,
    CASE s.State WHEN 'Maharashtra' THEN '27' WHEN 'Karnataka' THEN '29' WHEN 'Delhi' THEN '07'
                 WHEN 'Tamil Nadu' THEN '33' WHEN 'West Bengal' THEN '19' ELSE '00' END,
    CASE s.State WHEN 'Maharashtra' THEN 'WEST' WHEN 'Karnataka' THEN 'SOUTH'
                 WHEN 'Delhi' THEN 'NORTH' WHEN 'Tamil Nadu' THEN 'SOUTH'
                 WHEN 'West Bengal' THEN 'EAST' ELSE 'NORTH' END,
    s.ManagerName, '9800000000', NULL, s.ManagerName,
    s.GSTIN, s.Channel, s.ModusOperandi, s.MarginPercent, s.MarginType
FROM sales.Stores s
WHERE s.TenantId = @TenantId
AND NOT EXISTS (
    SELECT 1 FROM sales.CustomerMasterEntries cme
    WHERE cme.TenantId = @TenantId AND cme.StoreId = s.StoreId
);

PRINT 'Section 7: CustomerMasterEntries seeded.';
GO

-- ============================================================
-- SECTION 8 - Production Orders
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId UNIQUEIDENTIFIER;
SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';

DECLARE @AdminUserId UNIQUEIDENTIFIER;
SELECT TOP 1 @AdminUserId = u.UserId FROM auth.Users u
INNER JOIN auth.Roles r ON u.RoleId = r.RoleId
WHERE r.TenantId = @TenantId AND r.RoleName = 'Admin';

DECLARE @ArtDRB001 UNIQUEIDENTIFIER; SELECT @ArtDRB001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-001';
DECLARE @ArtDRB002 UNIQUEIDENTIFIER; SELECT @ArtDRB002 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-002';
DECLARE @ArtSNK001 UNIQUEIDENTIFIER; SELECT @ArtSNK001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-001';
DECLARE @GrpEX UNIQUEIDENTIFIER;     SELECT @GrpEX = GroupId FROM master.Groups WHERE TenantId = @TenantId AND GroupName = 'Executive Collection';
DECLARE @GrpSP UNIQUEIDENTIFIER;     SELECT @GrpSP = GroupId FROM master.Groups WHERE TenantId = @TenantId AND GroupName = 'Sport Collection';

-- Production Order 1
DECLARE @POId1 UNIQUEIDENTIFIER;
IF NOT EXISTS (SELECT 1 FROM production.ProductionOrders WHERE TenantId = @TenantId AND OrderNo = 'PO-2025-001')
BEGIN
    SET @POId1 = NEWID();
    INSERT INTO production.ProductionOrders
        (ProductionOrderId, TenantId, OrderNo, OrderDate, ArticleId, GroupId, Color, Last, UpperLeather, LiningLeather, Sole,
         OrderType, TotalQuantity, Status, ApprovedBy, ApprovedAt, CreatedBy)
    VALUES (@POId1, @TenantId, 'PO-2025-001', '2025-10-01', @ArtDRB001, @GrpEX, 'Black', '806',
            'Full Grain Cow Leather', 'Pig Leather Lining', 'TPR Sole',
            'FRESH', 480, 'COMPLETED', @AdminUserId, '2025-10-02T00:00:00', @AdminUserId);
    INSERT INTO production.ProductionSizeRuns (ProductionOrderId, EuroSize, Quantity, ProducedQty) VALUES
        (@POId1,39,50,50),(@POId1,40,60,60),(@POId1,41,70,70),(@POId1,42,80,80),
        (@POId1,43,80,80),(@POId1,44,70,70),(@POId1,45,50,50),(@POId1,46,20,20);
END

-- Production Order 2
DECLARE @POId2 UNIQUEIDENTIFIER;
IF NOT EXISTS (SELECT 1 FROM production.ProductionOrders WHERE TenantId = @TenantId AND OrderNo = 'PO-2025-002')
BEGIN
    SET @POId2 = NEWID();
    INSERT INTO production.ProductionOrders
        (ProductionOrderId, TenantId, OrderNo, OrderDate, ArticleId, GroupId, Color, Last, UpperLeather, LiningLeather, Sole,
         OrderType, TotalQuantity, Status, ApprovedBy, ApprovedAt, CreatedBy)
    VALUES (@POId2, @TenantId, 'PO-2025-002', '2025-10-05', @ArtDRB002, @GrpEX, 'Brown', '806',
            'Full Grain Cow Leather', 'Pig Leather Lining', 'TPR Sole',
            'FRESH', 360, 'COMPLETED', @AdminUserId, '2025-10-06T00:00:00', @AdminUserId);
    INSERT INTO production.ProductionSizeRuns (ProductionOrderId, EuroSize, Quantity, ProducedQty) VALUES
        (@POId2,39,40,40),(@POId2,40,50,50),(@POId2,41,60,60),(@POId2,42,60,60),
        (@POId2,43,60,60),(@POId2,44,50,50),(@POId2,45,30,30),(@POId2,46,10,10);
END

-- Production Order 3 (In Production)
DECLARE @POId3 UNIQUEIDENTIFIER;
IF NOT EXISTS (SELECT 1 FROM production.ProductionOrders WHERE TenantId = @TenantId AND OrderNo = 'PO-2025-003')
BEGIN
    SET @POId3 = NEWID();
    INSERT INTO production.ProductionOrders
        (ProductionOrderId, TenantId, OrderNo, OrderDate, ArticleId, GroupId, Color, Last, UpperLeather, LiningLeather, Sole,
         OrderType, TotalQuantity, Status, ApprovedBy, ApprovedAt, CreatedBy)
    VALUES (@POId3, @TenantId, 'PO-2025-003', '2025-11-01', @ArtSNK001, @GrpSP, 'White', '501',
            'Synthetic Upper', 'Mesh Lining', 'EVA+Rubber Sole',
            'REPLENISHMENT', 320, 'IN_PRODUCTION', @AdminUserId, '2025-11-02T00:00:00', @AdminUserId);
    INSERT INTO production.ProductionSizeRuns (ProductionOrderId, EuroSize, Quantity, ProducedQty) VALUES
        (@POId3,39,30,15),(@POId3,40,40,20),(@POId3,41,50,25),(@POId3,42,60,30),
        (@POId3,43,60,30),(@POId3,44,50,25),(@POId3,45,20,10),(@POId3,46,10,5);
END

PRINT 'Section 8: ProductionOrders seeded.';
GO

-- ============================================================
-- SECTION 9 - Stock (GRN → StockLedger → StockMovements)
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId UNIQUEIDENTIFIER;
SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';

DECLARE @WHMumbai UNIQUEIDENTIFIER; SELECT @WHMumbai = WarehouseId FROM warehouse.Warehouses WHERE TenantId = @TenantId AND WarehouseCode = 'WH-MH';
DECLARE @WHDelhi  UNIQUEIDENTIFIER; SELECT @WHDelhi  = WarehouseId FROM warehouse.Warehouses WHERE TenantId = @TenantId AND WarehouseCode = 'WH-DL';
DECLARE @AdminUserId UNIQUEIDENTIFIER;
SELECT TOP 1 @AdminUserId = u.UserId FROM auth.Users u
INNER JOIN auth.Roles r ON u.RoleId = r.RoleId
WHERE r.TenantId = @TenantId AND r.RoleName = 'Admin';

-- GRN 1: Mumbai - CS-DRB-001 (480 pairs from PO-2025-001)
DECLARE @GRN1Id UNIQUEIDENTIFIER;
IF NOT EXISTS (SELECT 1 FROM inventory.GoodsReceivedNotes WHERE TenantId = @TenantId AND GRNNumber = 'GRN-2025-001')
BEGIN
    SET @GRN1Id = NEWID();
    DECLARE @ArtDRB001 UNIQUEIDENTIFIER; SELECT @ArtDRB001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-001';
    INSERT INTO inventory.GoodsReceivedNotes
        (GRNId, TenantId, GRNNumber, WarehouseId, ReceiptDate, SourceType, ReferenceNo, Status, TotalQuantity, CreatedBy)
    VALUES (@GRN1Id, @TenantId, 'GRN-2025-001', @WHMumbai, '2025-10-20', 'Production', 'PO-2025-001', 'Confirmed', 480, @AdminUserId);
    INSERT INTO inventory.GRNLines (GRNId, ArticleId, EuroSize, Quantity) VALUES
        (@GRN1Id,@ArtDRB001,39,50),(@GRN1Id,@ArtDRB001,40,60),(@GRN1Id,@ArtDRB001,41,70),(@GRN1Id,@ArtDRB001,42,80),
        (@GRN1Id,@ArtDRB001,43,80),(@GRN1Id,@ArtDRB001,44,70),(@GRN1Id,@ArtDRB001,45,50),(@GRN1Id,@ArtDRB001,46,20);
END

-- GRN 2: Mumbai - CS-DRB-002 (360 pairs from PO-2025-002)
IF NOT EXISTS (SELECT 1 FROM inventory.GoodsReceivedNotes WHERE TenantId = @TenantId AND GRNNumber = 'GRN-2025-002')
BEGIN
    SET @GRN1Id = NEWID();
    DECLARE @ArtDRB002 UNIQUEIDENTIFIER; SELECT @ArtDRB002 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-002';
    INSERT INTO inventory.GoodsReceivedNotes
        (GRNId, TenantId, GRNNumber, WarehouseId, ReceiptDate, SourceType, ReferenceNo, Status, TotalQuantity, CreatedBy)
    VALUES (@GRN1Id, @TenantId, 'GRN-2025-002', @WHMumbai, '2025-10-22', 'Production', 'PO-2025-002', 'Confirmed', 360, @AdminUserId);
    INSERT INTO inventory.GRNLines (GRNId, ArticleId, EuroSize, Quantity) VALUES
        (@GRN1Id,@ArtDRB002,39,40),(@GRN1Id,@ArtDRB002,40,50),(@GRN1Id,@ArtDRB002,41,60),(@GRN1Id,@ArtDRB002,42,60),
        (@GRN1Id,@ArtDRB002,43,60),(@GRN1Id,@ArtDRB002,44,50),(@GRN1Id,@ArtDRB002,45,30),(@GRN1Id,@ArtDRB002,46,10);
END

-- GRN 3: Delhi - US-LOA-001, RF-SNK-001 (purchase)
IF NOT EXISTS (SELECT 1 FROM inventory.GoodsReceivedNotes WHERE TenantId = @TenantId AND GRNNumber = 'GRN-2025-003')
BEGIN
    SET @GRN1Id = NEWID();
    DECLARE @ArtLOA001 UNIQUEIDENTIFIER; SELECT @ArtLOA001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'US-LOA-001';
    DECLARE @ArtSNK001 UNIQUEIDENTIFIER; SELECT @ArtSNK001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-001';
    INSERT INTO inventory.GoodsReceivedNotes
        (GRNId, TenantId, GRNNumber, WarehouseId, ReceiptDate, SourceType, ReferenceNo, Status, TotalQuantity, CreatedBy)
    VALUES (@GRN1Id, @TenantId, 'GRN-2025-003', @WHDelhi, '2025-11-01', 'Purchase', 'PO-VENDOR-101', 'Confirmed', 480, @AdminUserId);
    INSERT INTO inventory.GRNLines (GRNId, ArticleId, EuroSize, Quantity) VALUES
        (@GRN1Id,@ArtLOA001,39,20),(@GRN1Id,@ArtLOA001,40,30),(@GRN1Id,@ArtLOA001,41,40),(@GRN1Id,@ArtLOA001,42,40),
        (@GRN1Id,@ArtLOA001,43,30),(@GRN1Id,@ArtLOA001,44,20),(@GRN1Id,@ArtLOA001,45,10),(@GRN1Id,@ArtLOA001,46,10),
        (@GRN1Id,@ArtSNK001,39,30),(@GRN1Id,@ArtSNK001,40,40),(@GRN1Id,@ArtSNK001,41,50),(@GRN1Id,@ArtSNK001,42,50),
        (@GRN1Id,@ArtSNK001,43,40),(@GRN1Id,@ArtSNK001,44,30),(@GRN1Id,@ArtSNK001,45,20),(@GRN1Id,@ArtSNK001,46,10);
END

-- Seed StockLedger for all footwear articles in both warehouses
-- Mumbai warehouse
DECLARE @ArticleIds TABLE (ArticleId UNIQUEIDENTIFIER, Code NVARCHAR(50));
INSERT INTO @ArticleIds SELECT ArticleId, ArticleCode FROM product.Articles
WHERE TenantId = @TenantId AND ArticleCode IN ('CS-DRB-001','CS-DRB-002','CS-OXF-001','US-LOA-001','US-LOA-002','RF-SNK-001','RF-SNK-002');

DECLARE @Sizes TABLE (EuroSize INT);
INSERT INTO @Sizes VALUES (39),(40),(41),(42),(43),(44),(45),(46);

-- Mumbai opening stock
INSERT INTO inventory.StockLedger (TenantId, WarehouseId, ArticleId, EuroSize, OpeningStock, InwardQty, OutwardQty)
SELECT
    @TenantId, @WHMumbai, a.ArticleId, s.EuroSize,
    CASE a.Code
        WHEN 'CS-DRB-001' THEN CASE s.EuroSize WHEN 39 THEN 50 WHEN 40 THEN 60 WHEN 41 THEN 70 WHEN 42 THEN 80 WHEN 43 THEN 80 WHEN 44 THEN 70 WHEN 45 THEN 50 WHEN 46 THEN 20 END
        WHEN 'CS-DRB-002' THEN CASE s.EuroSize WHEN 39 THEN 40 WHEN 40 THEN 50 WHEN 41 THEN 60 WHEN 42 THEN 60 WHEN 43 THEN 60 WHEN 44 THEN 50 WHEN 45 THEN 30 WHEN 46 THEN 10 END
        WHEN 'CS-OXF-001' THEN CASE s.EuroSize WHEN 39 THEN 30 WHEN 40 THEN 40 WHEN 41 THEN 50 WHEN 42 THEN 50 WHEN 43 THEN 40 WHEN 44 THEN 30 WHEN 45 THEN 20 WHEN 46 THEN 10 END
        WHEN 'US-LOA-001' THEN CASE s.EuroSize WHEN 39 THEN 25 WHEN 40 THEN 35 WHEN 41 THEN 40 WHEN 42 THEN 40 WHEN 43 THEN 35 WHEN 44 THEN 25 WHEN 45 THEN 15 WHEN 46 THEN 5 END
        WHEN 'RF-SNK-001' THEN CASE s.EuroSize WHEN 39 THEN 40 WHEN 40 THEN 50 WHEN 41 THEN 60 WHEN 42 THEN 60 WHEN 43 THEN 50 WHEN 44 THEN 40 WHEN 45 THEN 20 WHEN 46 THEN 10 END
        ELSE 20
    END,
    0, 0
FROM @ArticleIds a
CROSS JOIN @Sizes s
WHERE a.Code NOT IN ('US-LOA-002','RF-SNK-002') -- women's/unisex variants in Delhi
AND NOT EXISTS (
    SELECT 1 FROM inventory.StockLedger x
    WHERE x.TenantId = @TenantId AND x.WarehouseId = @WHMumbai AND x.ArticleId = a.ArticleId AND x.EuroSize = s.EuroSize
);

-- Delhi opening stock for loafers and sneakers
INSERT INTO inventory.StockLedger (TenantId, WarehouseId, ArticleId, EuroSize, OpeningStock, InwardQty, OutwardQty)
SELECT
    @TenantId, @WHDelhi, a.ArticleId, s.EuroSize,
    CASE a.Code
        WHEN 'US-LOA-001' THEN CASE s.EuroSize WHEN 39 THEN 20 WHEN 40 THEN 30 WHEN 41 THEN 40 WHEN 42 THEN 40 WHEN 43 THEN 30 WHEN 44 THEN 20 WHEN 45 THEN 10 WHEN 46 THEN 10 END
        WHEN 'RF-SNK-001' THEN CASE s.EuroSize WHEN 39 THEN 30 WHEN 40 THEN 40 WHEN 41 THEN 50 WHEN 42 THEN 50 WHEN 43 THEN 40 WHEN 44 THEN 30 WHEN 45 THEN 20 WHEN 46 THEN 10 END
        WHEN 'RF-SNK-002' THEN CASE s.EuroSize WHEN 39 THEN 25 WHEN 40 THEN 35 WHEN 41 THEN 45 WHEN 42 THEN 45 WHEN 43 THEN 35 WHEN 44 THEN 25 WHEN 45 THEN 15 WHEN 46 THEN 5 END
        ELSE 15
    END,
    0, 0
FROM @ArticleIds a
CROSS JOIN @Sizes s
WHERE a.Code IN ('US-LOA-001','RF-SNK-001','RF-SNK-002')
AND NOT EXISTS (
    SELECT 1 FROM inventory.StockLedger x
    WHERE x.TenantId = @TenantId AND x.WarehouseId = @WHDelhi AND x.ArticleId = a.ArticleId AND x.EuroSize = s.EuroSize
);

-- Women's loafer (EUR 35-41) in Mumbai
DECLARE @WomenSizes TABLE (EuroSize INT);
INSERT INTO @WomenSizes VALUES (35),(36),(37),(38),(39),(40),(41);
DECLARE @ArtLOA002 UNIQUEIDENTIFIER; SELECT @ArtLOA002 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'US-LOA-002';
INSERT INTO inventory.StockLedger (TenantId, WarehouseId, ArticleId, EuroSize, OpeningStock, InwardQty, OutwardQty)
SELECT @TenantId, @WHMumbai, @ArtLOA002, s.EuroSize,
    CASE s.EuroSize WHEN 35 THEN 15 WHEN 36 THEN 25 WHEN 37 THEN 35 WHEN 38 THEN 35 WHEN 39 THEN 25 WHEN 40 THEN 15 WHEN 41 THEN 10 END,
    0, 0
FROM @WomenSizes s
WHERE NOT EXISTS (
    SELECT 1 FROM inventory.StockLedger x
    WHERE x.TenantId = @TenantId AND x.WarehouseId = @WHMumbai AND x.ArticleId = @ArtLOA002 AND x.EuroSize = s.EuroSize
);

-- Leather goods (non-size-based) - single row with NULL EuroSize
DECLARE @LeatherArticles TABLE (ArticleId UNIQUEIDENTIFIER);
INSERT INTO @LeatherArticles SELECT ArticleId FROM product.Articles
WHERE TenantId = @TenantId AND ArticleCode IN ('BC-TOT-001','BC-BRF-001','BK-BLT-001','BK-BLT-002');

INSERT INTO inventory.StockLedger (TenantId, WarehouseId, ArticleId, EuroSize, OpeningStock, InwardQty, OutwardQty)
SELECT @TenantId, @WHMumbai, la.ArticleId, NULL, 50, 0, 0
FROM @LeatherArticles la
WHERE NOT EXISTS (
    SELECT 1 FROM inventory.StockLedger x
    WHERE x.TenantId = @TenantId AND x.WarehouseId = @WHMumbai AND x.ArticleId = la.ArticleId AND x.EuroSize IS NULL
);

PRINT 'Section 9: GRN, StockLedger seeded.';
GO

-- ============================================================
-- SECTION 10 - Customer Orders
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId UNIQUEIDENTIFIER;
SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';

DECLARE @WHMumbai UNIQUEIDENTIFIER; SELECT @WHMumbai = WarehouseId FROM warehouse.Warehouses WHERE TenantId = @TenantId AND WarehouseCode = 'WH-MH';
DECLARE @CLT001 UNIQUEIDENTIFIER; SELECT @CLT001 = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-001';
DECLARE @CLT002 UNIQUEIDENTIFIER; SELECT @CLT002 = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-002';
DECLARE @STR001 UNIQUEIDENTIFIER; SELECT @STR001 = StoreId FROM sales.Stores WHERE TenantId = @TenantId AND StoreCode = 'STR-001-MBD';
DECLARE @STR002 UNIQUEIDENTIFIER; SELECT @STR002 = StoreId FROM sales.Stores WHERE TenantId = @TenantId AND StoreCode = 'STR-002-BLR';
DECLARE @AdminUserId UNIQUEIDENTIFIER;
SELECT TOP 1 @AdminUserId = u.UserId FROM auth.Users u INNER JOIN auth.Roles r ON u.RoleId = r.RoleId WHERE r.TenantId = @TenantId AND r.RoleName = 'Admin';

DECLARE @ArtDRB001 UNIQUEIDENTIFIER; SELECT @ArtDRB001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-001';
DECLARE @ArtDRB002 UNIQUEIDENTIFIER; SELECT @ArtDRB002 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-002';
DECLARE @ArtSNK001 UNIQUEIDENTIFIER; SELECT @ArtSNK001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'RF-SNK-001';

-- Order 1 - Vision Footwear, Malad Mumbai
DECLARE @OrdId1 UNIQUEIDENTIFIER;
IF NOT EXISTS (SELECT 1 FROM sales.CustomerOrders WHERE TenantId = @TenantId AND OrderNo = 'ORD-2025-001')
BEGIN
    SET @OrdId1 = NEWID();
    INSERT INTO sales.CustomerOrders
        (OrderId, TenantId, OrderNo, OrderDate, ClientId, StoreId, WarehouseId, TotalQuantity, TotalMRP, TotalAmount, Status, ConfirmedBy, ConfirmedAt, CreatedBy)
    VALUES (@OrdId1, @TenantId, 'ORD-2025-001', '2025-11-01', @CLT001, @STR001, @WHMumbai,
            160, 479200.00, 335440.00, 'DISPATCHED', @AdminUserId, '2025-11-02T00:00:00', @AdminUserId);

    DECLARE @OL1 UNIQUEIDENTIFIER = NEWID();
    INSERT INTO sales.OrderLines (OrderLineId, OrderId, ArticleId, Color, EuroSize, HSNCode, MRP, Quantity, DispatchedQty, LineTotal, StockAvailable)
    SELECT NEWID(), @OrdId1, @ArtDRB001, 'Black', s.EuroSize, '64039990', 3995.00,
        CASE s.EuroSize WHEN 39 THEN 15 WHEN 40 THEN 20 WHEN 41 THEN 25 WHEN 42 THEN 25 WHEN 43 THEN 20 WHEN 44 THEN 15 WHEN 45 THEN 10 WHEN 46 THEN 5 ELSE 10 END,
        CASE s.EuroSize WHEN 39 THEN 15 WHEN 40 THEN 20 WHEN 41 THEN 25 WHEN 42 THEN 25 WHEN 43 THEN 20 WHEN 44 THEN 15 WHEN 45 THEN 10 WHEN 46 THEN 5 ELSE 10 END,
        3995.00 * CASE s.EuroSize WHEN 39 THEN 15 WHEN 40 THEN 20 WHEN 41 THEN 25 WHEN 42 THEN 25 WHEN 43 THEN 20 WHEN 44 THEN 15 WHEN 45 THEN 10 WHEN 46 THEN 5 ELSE 10 END,
        1
    FROM (VALUES (39),(40),(41),(42),(43),(44),(45),(46)) AS s(EuroSize);
END

-- Order 2 - Metro Shoes, Bangalore
IF NOT EXISTS (SELECT 1 FROM sales.CustomerOrders WHERE TenantId = @TenantId AND OrderNo = 'ORD-2025-002')
BEGIN
    DECLARE @OrdId2 UNIQUEIDENTIFIER = NEWID();
    INSERT INTO sales.CustomerOrders
        (OrderId, TenantId, OrderNo, OrderDate, ClientId, StoreId, WarehouseId, TotalQuantity, TotalMRP, TotalAmount, Status, ConfirmedBy, ConfirmedAt, CreatedBy)
    VALUES (@OrdId2, @TenantId, 'ORD-2025-002', '2025-11-05', @CLT002, @STR002, @WHMumbai,
            120, 419400.00, 293580.00, 'CONFIRMED', @AdminUserId, '2025-11-06T00:00:00', @AdminUserId);
    INSERT INTO sales.OrderLines (OrderLineId, OrderId, ArticleId, Color, EuroSize, HSNCode, MRP, Quantity, DispatchedQty, LineTotal, StockAvailable)
    SELECT NEWID(), @OrdId2, @ArtDRB002, 'Brown', s.EuroSize, '64039990', 3995.00,
        CASE s.EuroSize WHEN 39 THEN 12 WHEN 40 THEN 16 WHEN 41 THEN 20 WHEN 42 THEN 20 WHEN 43 THEN 18 WHEN 44 THEN 16 WHEN 45 THEN 12 WHEN 46 THEN 6 END,
        0,
        3995.00 * CASE s.EuroSize WHEN 39 THEN 12 WHEN 40 THEN 16 WHEN 41 THEN 20 WHEN 42 THEN 20 WHEN 43 THEN 18 WHEN 44 THEN 16 WHEN 45 THEN 12 WHEN 46 THEN 6 END,
        1
    FROM (VALUES (39),(40),(41),(42),(43),(44),(45),(46)) AS s(EuroSize);
END

-- Order 3 - Vision Footwear, Sneakers (DRAFT)
IF NOT EXISTS (SELECT 1 FROM sales.CustomerOrders WHERE TenantId = @TenantId AND OrderNo = 'ORD-2025-003')
BEGIN
    DECLARE @OrdId3 UNIQUEIDENTIFIER = NEWID();
    INSERT INTO sales.CustomerOrders
        (OrderId, TenantId, OrderNo, OrderDate, ClientId, StoreId, WarehouseId, TotalQuantity, TotalMRP, TotalAmount, Status, CreatedBy)
    VALUES (@OrdId3, @TenantId, 'ORD-2025-003', '2025-11-10', @CLT001, @STR001, @WHMumbai,
            80, 279600.00, 195720.00, 'DRAFT', @AdminUserId);
    INSERT INTO sales.OrderLines (OrderLineId, OrderId, ArticleId, Color, EuroSize, HSNCode, MRP, Quantity, DispatchedQty, LineTotal, StockAvailable)
    SELECT NEWID(), @OrdId3, @ArtSNK001, 'White', s.EuroSize, '64041990', 3495.00,
        CASE s.EuroSize WHEN 39 THEN 8 WHEN 40 THEN 10 WHEN 41 THEN 12 WHEN 42 THEN 14 WHEN 43 THEN 14 WHEN 44 THEN 12 WHEN 45 THEN 6 WHEN 46 THEN 4 END,
        0,
        3495.00 * CASE s.EuroSize WHEN 39 THEN 8 WHEN 40 THEN 10 WHEN 41 THEN 12 WHEN 42 THEN 14 WHEN 43 THEN 14 WHEN 44 THEN 12 WHEN 45 THEN 6 WHEN 46 THEN 4 END,
        1
    FROM (VALUES (39),(40),(41),(42),(43),(44),(45),(46)) AS s(EuroSize);
END

PRINT 'Section 10: CustomerOrders seeded.';
GO

-- ============================================================
-- SECTION 11 - Billing (Invoice, InvoiceLines, PackingList, DeliveryNote)
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId UNIQUEIDENTIFIER;
SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';

DECLARE @CLT001 UNIQUEIDENTIFIER; SELECT @CLT001 = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-001';
DECLARE @STR001 UNIQUEIDENTIFIER; SELECT @STR001 = StoreId FROM sales.Stores WHERE TenantId = @TenantId AND StoreCode = 'STR-001-MBD';
DECLARE @OrdId1 UNIQUEIDENTIFIER; SELECT @OrdId1 = OrderId FROM sales.CustomerOrders WHERE TenantId = @TenantId AND OrderNo = 'ORD-2025-001';
DECLARE @ArtDRB001 UNIQUEIDENTIFIER; SELECT @ArtDRB001 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-001';
DECLARE @AdminUserId UNIQUEIDENTIFIER;
SELECT TOP 1 @AdminUserId = u.UserId FROM auth.Users u INNER JOIN auth.Roles r ON u.RoleId = r.RoleId WHERE r.TenantId = @TenantId AND r.RoleName = 'Admin';

IF NOT EXISTS (SELECT 1 FROM billing.Invoices WHERE TenantId = @TenantId AND InvoiceNo = 'SKH/001/2526')
BEGIN
    DECLARE @InvId1 UNIQUEIDENTIFIER = NEWID();
    INSERT INTO billing.Invoices (
        InvoiceId, TenantId, InvoiceNo, InvoiceDate, InvoiceType, OrderId, ClientId, StoreId,
        BillToName, BillToAddress, BillToGSTIN, BillToState, BillToStateCode,
        ShipToName, ShipToAddress, ShipToGSTIN, ShipToState, ShipToStateCode,
        PlaceOfSupply, PlaceOfSupplyCode, IsInterState,
        SubTotal, TotalDiscount, TaxableAmount, CGSTAmount, SGSTAmount, IGSTAmount, TotalGST, GrandTotal, RoundOff, NetPayable,
        Status, CompanyName, CompanyAddress, CompanyGSTIN,
        BankName, BankAccountNo, BankIFSC, BankBranch,
        TotalQuantity, TotalAmount, SalesType, CreatedBy)
    VALUES (
        @InvId1, @TenantId, 'SKH/001/2526', '2025-11-15', 'TAX_INVOICE', @OrdId1, @CLT001, @STR001,
        'Vision Retail Pvt Ltd', 'Vision Footwear, Malad, Mumbai 400001', '27ABCPV1234A1Z1', 'Maharashtra', '27',
        'Vision Footwear Malad', 'Malad West, Mumbai 400001', '27ABCPV1234A1Z1', 'Maharashtra', '27',
        'Maharashtra', '27', 0,
        467215.00, 0.00, 467215.00, 42049.35, 42049.35, 0.00, 84098.70, 551313.70, 0.30, 551314.00,
        'Draft', 'SKH EXPORTS', 'Plot No. 17, Sector 5, Industrial Area, Bhiwandi, Mumbai 421302', '27AABCE1234F1Z5',
        'HDFC BANK', '50200073196749', 'HDFC0001295', 'RANIPET',
        135, 551314.00, 'Local', @AdminUserId);

    -- InvoiceLines - one per size
    INSERT INTO billing.InvoiceLines (
        InvoiceId, ArticleId, ArticleCode, ArticleName, HSNCode, Color, EuroSize, UOM, Quantity,
        MRP, MarginPercent, MarginAmount, UnitPrice, TaxableAmount, GSTRate,
        CGSTRate, CGSTAmount, SGSTRate, SGSTAmount, IGSTRate, IGSTAmount, TotalAmount, LineNumber)
    SELECT
        @InvId1, @ArtDRB001, 'CS-DRB-001', 'ClassicStep Executive Derby - Black',
        '64039990', 'Black', s.EuroSize, 'PAIRS', s.Qty,
        3995.00, 30.00, 3995.00 * 0.30, 3995.00 * 0.70,
        3995.00 * 0.70 * s.Qty, 18.00,
        9.00, 3995.00 * 0.70 * s.Qty * 0.09,
        9.00, 3995.00 * 0.70 * s.Qty * 0.09,
        0.00, 0.00,
        3995.00 * 0.70 * s.Qty * 1.18,
        s.LineNo
    FROM (VALUES
        (39,15,1),(40,20,2),(41,25,3),(42,25,4),(43,20,5),(44,15,6),(45,10,7),(46,5,8)
    ) AS s(EuroSize, Qty, LineNo);

    -- Packing List
    DECLARE @PackId1 UNIQUEIDENTIFIER = NEWID();
    INSERT INTO billing.PackingLists
        (PackingListId, TenantId, InvoiceId, PackingNo, PackingDate, TotalCartons, TotalPairs,
         TransportMode, LogisticsPartner, VehicleNumber, LRNumber, LRDate, Status, CreatedBy)
    VALUES (@PackId1, @TenantId, @InvId1, 'PKL/001/2526', '2025-11-16', 14, 135,
            'ROAD', 'Blue Dart Logistics', 'MH04 AB 1234', 'LR-2025-BLU-001', '2025-11-16', 'Draft', @AdminUserId);

    INSERT INTO billing.PackingListLines (PackingListId, CartonNumber, ArticleId, EuroSize, Quantity, ArticleName, Color, HSNCode)
    SELECT @PackId1, s.CartonNo, @ArtDRB001, s.EuroSize, s.Qty, 'ClassicStep Executive Derby - Black', 'Black', '64039990'
    FROM (VALUES
        (1,39,15),(2,40,20),(3,41,25),(4,42,25),(5,43,20),(6,44,15),(7,45,10),(8,46,5)
    ) AS s(CartonNo, EuroSize, Qty);

    -- Delivery Note
    INSERT INTO billing.DeliveryNotes
        (TenantId, InvoiceId, PackingListId, DeliveryNoteNo, DeliveryDate, Status, TransporterName, VehicleNumber, LRNumber, DispatchDate, CreatedBy)
    VALUES (@TenantId, @InvId1, @PackId1, 'DN/001/2526', '2025-11-17',
            'Created', 'Blue Dart Logistics', 'MH04 AB 1234', 'LR-2025-BLU-001', '2025-11-16', @AdminUserId);
END

-- Second invoice for CLT-002
DECLARE @CLT002 UNIQUEIDENTIFIER; SELECT @CLT002 = ClientId FROM sales.Clients WHERE TenantId = @TenantId AND ClientCode = 'CLT-002';
DECLARE @STR002 UNIQUEIDENTIFIER; SELECT @STR002 = StoreId FROM sales.Stores WHERE TenantId = @TenantId AND StoreCode = 'STR-002-BLR';
DECLARE @OrdId2 UNIQUEIDENTIFIER; SELECT @OrdId2 = OrderId FROM sales.CustomerOrders WHERE TenantId = @TenantId AND OrderNo = 'ORD-2025-002';
DECLARE @ArtDRB002 UNIQUEIDENTIFIER; SELECT @ArtDRB002 = ArticleId FROM product.Articles WHERE TenantId = @TenantId AND ArticleCode = 'CS-DRB-002';

IF NOT EXISTS (SELECT 1 FROM billing.Invoices WHERE TenantId = @TenantId AND InvoiceNo = 'SKH/002/2526')
BEGIN
    DECLARE @InvId2 UNIQUEIDENTIFIER = NEWID();
    INSERT INTO billing.Invoices (
        InvoiceId, TenantId, InvoiceNo, InvoiceDate, InvoiceType, OrderId, ClientId, StoreId,
        BillToName, BillToAddress, BillToGSTIN, BillToState, BillToStateCode,
        ShipToName, ShipToAddress, ShipToGSTIN, ShipToState, ShipToStateCode,
        PlaceOfSupply, PlaceOfSupplyCode, IsInterState,
        SubTotal, TotalDiscount, TaxableAmount, IGSTAmount, TotalGST, GrandTotal, RoundOff, NetPayable,
        Status, CompanyName, CompanyGSTIN, TotalQuantity, TotalAmount, SalesType, CreatedBy)
    VALUES (
        @InvId2, @TenantId, 'SKH/002/2526', '2025-11-20', 'TAX_INVOICE', @OrdId2, @CLT002, @STR002,
        'Metro Brands Ltd', 'Orion Mall, Bangalore 560001', '29AAAMB5678B1Z2', 'Karnataka', '29',
        'Metro - Orion Mall', 'Orion Mall, Bangalore 560001', '29AAAMB5678B1Z2', 'Karnataka', '29',
        'Karnataka', '29', 1,
        335280.00, 0.00, 335280.00, 0.00, 60350.40, 395630.40, 0.60, 395631.00,
        'Draft', 'SKH EXPORTS', '27AABCE1234F1Z5', 120, 395631.00, 'Interstate', @AdminUserId);

    INSERT INTO billing.InvoiceLines (
        InvoiceId, ArticleId, ArticleCode, ArticleName, HSNCode, Color, EuroSize, UOM, Quantity,
        MRP, MarginPercent, MarginAmount, UnitPrice, TaxableAmount, GSTRate,
        CGSTRate, CGSTAmount, SGSTRate, SGSTAmount, IGSTRate, IGSTAmount, TotalAmount, LineNumber)
    SELECT
        @InvId2, @ArtDRB002, 'CS-DRB-002', 'ClassicStep Executive Derby - Brown',
        '64039990', 'Brown', s.EuroSize, 'PAIRS', s.Qty,
        3995.00, 28.00, 3995.00 * 0.28, 3995.00 * 0.72,
        3995.00 * 0.72 * s.Qty, 18.00,
        0.00, 0.00, 0.00, 0.00,
        18.00, 3995.00 * 0.72 * s.Qty * 0.18,
        3995.00 * 0.72 * s.Qty * 1.18,
        s.LineNo
    FROM (VALUES
        (39,12,1),(40,16,2),(41,20,3),(42,20,4),(43,18,5),(44,16,6),(45,12,7),(46,6,8)
    ) AS s(EuroSize, Qty, LineNo);
END

PRINT 'Section 11: Invoices, PackingLists, DeliveryNotes seeded.';
GO

-- ============================================================
-- SECTION 12 - Stock Freeze (monthly freeze record - current month)
-- ============================================================
USE RetailERP;
GO
SET NOCOUNT ON;

DECLARE @TenantId UNIQUEIDENTIFIER;
SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode = 'ELCURIO';
DECLARE @WHMumbai UNIQUEIDENTIFIER; SELECT @WHMumbai = WarehouseId FROM warehouse.Warehouses WHERE TenantId = @TenantId AND WarehouseCode = 'WH-MH';
DECLARE @WHDelhi  UNIQUEIDENTIFIER; SELECT @WHDelhi  = WarehouseId FROM warehouse.Warehouses WHERE TenantId = @TenantId AND WarehouseCode = 'WH-DL';

-- October 2025 freeze (frozen) and November 2025 (open)
INSERT INTO inventory.StockFreezes (TenantId, WarehouseId, FreezeMonth, FreezeYear, Status)
SELECT s.TenantId, s.WarehouseId, s.FreezeMonth, s.FreezeYear, s.Status
FROM (VALUES
    (@TenantId, @WHMumbai, 10, 2025, 'Frozen'),
    (@TenantId, @WHMumbai, 11, 2025, 'Open'),
    (@TenantId, @WHDelhi,  10, 2025, 'Frozen'),
    (@TenantId, @WHDelhi,  11, 2025, 'Open')
) AS s(TenantId, WarehouseId, FreezeMonth, FreezeYear, Status)
WHERE NOT EXISTS (
    SELECT 1 FROM inventory.StockFreezes x
    WHERE x.TenantId = s.TenantId AND x.WarehouseId = s.WarehouseId
    AND x.FreezeMonth = s.FreezeMonth AND x.FreezeYear = s.FreezeYear
);

PRINT 'Section 12: StockFreezes seeded.';
GO

PRINT '=== All seed data inserted successfully ===';
GO
