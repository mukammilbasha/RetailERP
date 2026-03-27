
-- ====================================================================
-- PART 5 : SEED DATA
-- Idempotent — safe to re-run (IF NOT EXISTS / NOT EXISTS guards)
-- ====================================================================
USE RetailERP;
GO
SET NOCOUNT ON;

-- ── 5.1  PERMISSIONS ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM auth.Permissions WHERE Module='Dashboard')
INSERT INTO auth.Permissions (PermissionId,Module,CanView,CanAdd,CanEdit,CanDelete) VALUES
(NEWID(),'Dashboard',  1,0,0,0),(NEWID(),'Clients',   1,1,1,1),(NEWID(),'Stores',    1,1,1,1),
(NEWID(),'Warehouses', 1,1,1,1),(NEWID(),'Articles',  1,1,1,1),(NEWID(),'MDA',       1,1,1,1),
(NEWID(),'Stock',      1,1,1,1),(NEWID(),'Receipt',   1,1,1,1),(NEWID(),'Dispatch',  1,1,1,1),
(NEWID(),'Returns',    1,1,1,1),(NEWID(),'Analytics', 1,0,0,0),(NEWID(),'Reports',   1,0,0,0),
(NEWID(),'Users',      1,1,1,1),(NEWID(),'Roles',     1,1,1,1),(NEWID(),'Audit',     1,0,0,0),
(NEWID(),'Brands',     1,1,1,1),(NEWID(),'Genders',   1,1,1,1),(NEWID(),'Seasons',   1,1,1,1),
(NEWID(),'Segments',   1,1,1,1),(NEWID(),'Categories',1,1,1,1),(NEWID(),'Groups',    1,1,1,1),
(NEWID(),'Sizes',      1,1,1,1),(NEWID(),'Production',1,1,1,1),(NEWID(),'Orders',    1,1,1,1),
(NEWID(),'Billing',    1,1,1,1);
GO

-- ── 5.2  INDIAN STATES ──────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM master.States WHERE StateId=1)
INSERT INTO master.States (StateId,StateName,StateCode,Zone) VALUES
(1,'Jammu & Kashmir','01','NORTH'),(2,'Himachal Pradesh','02','NORTH'),
(3,'Punjab','03','NORTH'),(4,'Chandigarh','04','NORTH'),
(5,'Uttarakhand','05','NORTH'),(6,'Haryana','06','NORTH'),
(7,'Delhi','07','NORTH'),(8,'Rajasthan','08','WEST'),
(9,'Uttar Pradesh','09','NORTH'),(10,'Bihar','10','EAST'),
(11,'Sikkim','11','EAST'),(12,'Arunachal Pradesh','12','EAST'),
(13,'Nagaland','13','EAST'),(14,'Manipur','14','EAST'),
(15,'Mizoram','15','EAST'),(16,'Tripura','16','EAST'),
(17,'Meghalaya','17','EAST'),(18,'Assam','18','EAST'),
(19,'West Bengal','19','EAST'),(20,'Jharkhand','20','EAST'),
(21,'Odisha','21','EAST'),(22,'Chhattisgarh','22','CENTRAL'),
(23,'Madhya Pradesh','23','CENTRAL'),(24,'Gujarat','24','WEST'),
(26,'Dadra & Nagar Haveli and Daman & Diu','26','WEST'),
(27,'Maharashtra','27','WEST'),(29,'Karnataka','29','SOUTH'),
(30,'Goa','30','WEST'),(32,'Kerala','32','SOUTH'),
(33,'Tamil Nadu','33','SOUTH'),(34,'Puducherry','34','SOUTH'),
(36,'Telangana','36','SOUTH'),(37,'Andhra Pradesh','37','SOUTH');
GO

-- ── 5.3  HSN CODES ──────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM master.HSNCodes WHERE HSNCode='64039990')
INSERT INTO master.HSNCodes (HSNId,HSNCode,Description,GSTRate) VALUES
(NEWID(),'64039990','Footwear with outer soles of rubber/plastics, upper of leather',18.00),
(NEWID(),'64041990','Footwear with outer soles of rubber/plastics, upper of textile',18.00),
(NEWID(),'64029990','Other footwear with outer soles and uppers of rubber or plastics',18.00),
(NEWID(),'42021290','Trunks, suit-cases, vanity-cases',18.00),
(NEWID(),'42023290','Wallets, purses, key-pouches of leather',18.00),
(NEWID(),'42033000','Belts and bandoliers of leather',18.00),
(NEWID(),'42031000','Articles of apparel of leather',18.00);
GO

-- ── 5.4  TENANT, ROLES, USERS ────────────────────────────────────────
DECLARE @TenantId UNIQUEIDENTIFIER;
SELECT @TenantId = TenantId FROM auth.Tenants WHERE TenantCode='ELCURIO';
IF @TenantId IS NULL BEGIN
    SET @TenantId = NEWID();
    INSERT INTO auth.Tenants(TenantId,TenantName,TenantCode,CompanyName,GSTIN,Address,City,State,PinCode,Phone,Email)
    VALUES(@TenantId,'EL CURIO','ELCURIO','EL CURIO Multi-Tenant Retail Distribution',
           '27AABCE1234F1Z5','Plot No. 17, Sector 5, Industrial Area','Bhiwandi, Mumbai','Maharashtra','421302',
           '9876543210','info@elcurio.com');
END

DECLARE @AdminRoleId    UNIQUEIDENTIFIER;
DECLARE @ManagerRoleId  UNIQUEIDENTIFIER;
DECLARE @AccountsRoleId UNIQUEIDENTIFIER;
DECLARE @ViewerRoleId   UNIQUEIDENTIFIER;
SELECT @AdminRoleId    = RoleId FROM auth.Roles WHERE TenantId=@TenantId AND RoleName='Admin';
SELECT @ManagerRoleId  = RoleId FROM auth.Roles WHERE TenantId=@TenantId AND RoleName='Storemanager';
SELECT @AccountsRoleId = RoleId FROM auth.Roles WHERE TenantId=@TenantId AND RoleName='Accountuser';
SELECT @ViewerRoleId   = RoleId FROM auth.Roles WHERE TenantId=@TenantId AND RoleName='Viewer';

IF @AdminRoleId IS NULL BEGIN SET @AdminRoleId=NEWID();
    INSERT INTO auth.Roles(RoleId,TenantId,RoleName,Description,IsSystem) VALUES(@AdminRoleId,@TenantId,'Admin','Full system access',1); END
IF @ManagerRoleId IS NULL BEGIN SET @ManagerRoleId=NEWID();
    INSERT INTO auth.Roles(RoleId,TenantId,RoleName,Description,IsSystem) VALUES(@ManagerRoleId,@TenantId,'Storemanager','Store management access',1); END
IF @AccountsRoleId IS NULL BEGIN SET @AccountsRoleId=NEWID();
    INSERT INTO auth.Roles(RoleId,TenantId,RoleName,Description,IsSystem) VALUES(@AccountsRoleId,@TenantId,'Accountuser','Accounts and billing access',1); END
IF @ViewerRoleId IS NULL BEGIN SET @ViewerRoleId=NEWID();
    INSERT INTO auth.Roles(RoleId,TenantId,RoleName,Description,IsSystem) VALUES(@ViewerRoleId,@TenantId,'Viewer','View-only access',1); END

-- Users (bcrypt of Admin@123)
DECLARE @PwHash NVARCHAR(500) = '$2a$11$RZAU5ibXoHEkyx7BU3KqBumDLTMJ.EyYZ/BPGtybueSsczawrIyQW';
IF NOT EXISTS (SELECT 1 FROM auth.Users WHERE TenantId=@TenantId AND Email='admin@elcurio.com')
    INSERT INTO auth.Users(UserId,TenantId,FullName,Email,PasswordHash,RoleId,IsActive,IsFirstLogin)
    VALUES(NEWID(),@TenantId,'Rajesh Kumar','admin@elcurio.com',@PwHash,@AdminRoleId,1,0);
IF NOT EXISTS (SELECT 1 FROM auth.Users WHERE TenantId=@TenantId AND Email='warehouse@elcurio.com')
    INSERT INTO auth.Users(UserId,TenantId,FullName,Email,PasswordHash,RoleId,IsActive,IsFirstLogin)
    VALUES(NEWID(),@TenantId,'Priya Sharma','warehouse@elcurio.com',@PwHash,@ManagerRoleId,1,1);
IF NOT EXISTS (SELECT 1 FROM auth.Users WHERE TenantId=@TenantId AND Email='accounts@elcurio.com')
    INSERT INTO auth.Users(UserId,TenantId,FullName,Email,PasswordHash,RoleId,IsActive,IsFirstLogin)
    VALUES(NEWID(),@TenantId,'Amit Patil','accounts@elcurio.com',@PwHash,@AccountsRoleId,1,1);
IF NOT EXISTS (SELECT 1 FROM auth.Users WHERE TenantId=@TenantId AND Email='viewer@elcurio.com')
    INSERT INTO auth.Users(UserId,TenantId,FullName,Email,PasswordHash,RoleId,IsActive,IsFirstLogin)
    VALUES(NEWID(),@TenantId,'Sneha Gupta','viewer@elcurio.com',@PwHash,@ViewerRoleId,1,1);
GO

-- ── 5.5  ROLE PERMISSIONS ────────────────────────────────────────────
DECLARE @TenantId       UNIQUEIDENTIFIER; SELECT @TenantId       = TenantId FROM auth.Tenants WHERE TenantCode='ELCURIO';
DECLARE @AdminRoleId    UNIQUEIDENTIFIER; SELECT @AdminRoleId    = RoleId FROM auth.Roles WHERE TenantId=@TenantId AND RoleName='Admin';
DECLARE @ManagerRoleId  UNIQUEIDENTIFIER; SELECT @ManagerRoleId  = RoleId FROM auth.Roles WHERE TenantId=@TenantId AND RoleName='Storemanager';
DECLARE @AccountsRoleId UNIQUEIDENTIFIER; SELECT @AccountsRoleId = RoleId FROM auth.Roles WHERE TenantId=@TenantId AND RoleName='Accountuser';
DECLARE @ViewerRoleId   UNIQUEIDENTIFIER; SELECT @ViewerRoleId   = RoleId FROM auth.Roles WHERE TenantId=@TenantId AND RoleName='Viewer';

INSERT INTO auth.RolePermissions(RoleId,PermissionId,CanView,CanAdd,CanEdit,CanDelete)
SELECT @AdminRoleId,PermissionId,1,1,1,1 FROM auth.Permissions
WHERE NOT EXISTS(SELECT 1 FROM auth.RolePermissions WHERE RoleId=@AdminRoleId AND PermissionId=auth.Permissions.PermissionId);

INSERT INTO auth.RolePermissions(RoleId,PermissionId,CanView,CanAdd,CanEdit,CanDelete)
SELECT @ManagerRoleId,p.PermissionId,1,
    CASE WHEN p.Module IN ('Users','Roles','Audit') THEN 0 ELSE 1 END,
    CASE WHEN p.Module IN ('Users','Roles','Audit') THEN 0 ELSE 1 END,
    CASE WHEN p.Module IN ('Users','Roles','Audit','Billing') THEN 0 ELSE 1 END
FROM auth.Permissions p
WHERE NOT EXISTS(SELECT 1 FROM auth.RolePermissions WHERE RoleId=@ManagerRoleId AND PermissionId=p.PermissionId);

INSERT INTO auth.RolePermissions(RoleId,PermissionId,CanView,CanAdd,CanEdit,CanDelete)
SELECT @AccountsRoleId,p.PermissionId,1,
    CASE WHEN p.Module IN ('Billing','Orders','Clients','Stores','Receipt','Dispatch','Returns','Reports','Analytics') THEN 1 ELSE 0 END,
    CASE WHEN p.Module IN ('Billing','Orders','Clients','Stores','Receipt','Dispatch','Returns') THEN 1 ELSE 0 END,
    CASE WHEN p.Module IN ('Billing','Orders') THEN 1 ELSE 0 END
FROM auth.Permissions p
WHERE NOT EXISTS(SELECT 1 FROM auth.RolePermissions WHERE RoleId=@AccountsRoleId AND PermissionId=p.PermissionId);

INSERT INTO auth.RolePermissions(RoleId,PermissionId,CanView,CanAdd,CanEdit,CanDelete)
SELECT @ViewerRoleId,PermissionId,1,0,0,0 FROM auth.Permissions
WHERE NOT EXISTS(SELECT 1 FROM auth.RolePermissions WHERE RoleId=@ViewerRoleId AND PermissionId=auth.Permissions.PermissionId);
GO

-- ── 5.6  MASTER DATA ────────────────────────────────────────────────
DECLARE @TenantId UNIQUEIDENTIFIER; SELECT @TenantId=TenantId FROM auth.Tenants WHERE TenantCode='ELCURIO';

IF NOT EXISTS(SELECT 1 FROM master.Brands WHERE TenantId=@TenantId AND BrandName='ClassicStep')
INSERT INTO master.Brands(BrandId,TenantId,BrandName) VALUES
(NEWID(),@TenantId,'ClassicStep'),(NEWID(),@TenantId,'RunFast'),(NEWID(),@TenantId,'UrbanStep'),
(NEWID(),@TenantId,'BagCraft'),(NEWID(),@TenantId,'TravelPro'),(NEWID(),@TenantId,'BeltKing');

IF NOT EXISTS(SELECT 1 FROM master.Genders WHERE TenantId=@TenantId AND GenderName='Men')
INSERT INTO master.Genders(GenderId,TenantId,GenderName) VALUES
(NEWID(),@TenantId,'Men'),(NEWID(),@TenantId,'Women'),(NEWID(),@TenantId,'Unisex');

IF NOT EXISTS(SELECT 1 FROM master.Seasons WHERE TenantId=@TenantId AND SeasonCode='SS24')
INSERT INTO master.Seasons(SeasonId,TenantId,SeasonCode,StartDate,EndDate) VALUES
(NEWID(),@TenantId,'SS24','2024-03-01','2024-08-31'),(NEWID(),@TenantId,'AW24','2024-09-01','2025-02-28'),
(NEWID(),@TenantId,'SS25','2025-03-01','2025-08-31'),(NEWID(),@TenantId,'AW25','2025-09-01','2026-02-28');

IF NOT EXISTS(SELECT 1 FROM master.Segments WHERE TenantId=@TenantId AND SegmentName='Footwear')
INSERT INTO master.Segments(SegmentId,TenantId,SegmentName) VALUES
(NEWID(),@TenantId,'Footwear'),(NEWID(),@TenantId,'Leather Goods');

IF NOT EXISTS(SELECT 1 FROM master.Categories WHERE TenantId=@TenantId AND CategoryName='Shoes')
INSERT INTO master.Categories(CategoryId,TenantId,CategoryName) VALUES
(NEWID(),@TenantId,'Shoes'),(NEWID(),@TenantId,'Bags'),(NEWID(),@TenantId,'Belts');

IF NOT EXISTS(SELECT 1 FROM master.Groups WHERE TenantId=@TenantId AND GroupName='Classic Collection')
INSERT INTO master.Groups(GroupId,TenantId,GroupName) VALUES
(NEWID(),@TenantId,'Classic Collection'),(NEWID(),@TenantId,'Urban Collection'),
(NEWID(),@TenantId,'Executive Collection'),(NEWID(),@TenantId,'Sport Collection');

-- Warehouses
IF NOT EXISTS(SELECT 1 FROM warehouse.Warehouses WHERE TenantId=@TenantId AND WarehouseCode='WH-MH')
INSERT INTO warehouse.Warehouses(WarehouseId,TenantId,WarehouseCode,WarehouseName,City,State) VALUES
(NEWID(),@TenantId,'WH-MH','Mumbai Central Warehouse','Mumbai','Maharashtra'),
(NEWID(),@TenantId,'WH-DL','Delhi Distribution Center','Gurgaon','Haryana');
GO

-- ── 5.7  SUB-SEGMENTS, SUB-CATEGORIES, COLORS, STYLES, FASTENERS ────
DECLARE @TenantId UNIQUEIDENTIFIER; SELECT @TenantId=TenantId FROM auth.Tenants WHERE TenantCode='ELCURIO';
DECLARE @SegFW UNIQUEIDENTIFIER; SELECT @SegFW=SegmentId FROM master.Segments WHERE TenantId=@TenantId AND SegmentName='Footwear';
DECLARE @SegLG UNIQUEIDENTIFIER; SELECT @SegLG=SegmentId FROM master.Segments WHERE TenantId=@TenantId AND SegmentName='Leather Goods';
DECLARE @CatSh UNIQUEIDENTIFIER; SELECT @CatSh=CategoryId FROM master.Categories WHERE TenantId=@TenantId AND CategoryName='Shoes';
DECLARE @CatBg UNIQUEIDENTIFIER; SELECT @CatBg=CategoryId FROM master.Categories WHERE TenantId=@TenantId AND CategoryName='Bags';
DECLARE @CatBl UNIQUEIDENTIFIER; SELECT @CatBl=CategoryId FROM master.Categories WHERE TenantId=@TenantId AND CategoryName='Belts';

INSERT INTO master.SubSegments(SubSegmentId,TenantId,SegmentId,SubSegmentName)
SELECT NEWID(),s.TenantId,s.SegmentId,s.SubSegmentName FROM (VALUES
    (@TenantId,@SegFW,'Formal'),(@TenantId,@SegFW,'Casual'),(@TenantId,@SegFW,'Sports'),
    (@TenantId,@SegFW,'Ethnic'),(@TenantId,@SegLG,'Handbags'),
    (@TenantId,@SegLG,'Wallets'),(@TenantId,@SegLG,'Accessories')
) AS s(TenantId,SegmentId,SubSegmentName)
WHERE NOT EXISTS(SELECT 1 FROM master.SubSegments x WHERE x.SegmentId=s.SegmentId AND x.SubSegmentName=s.SubSegmentName);

INSERT INTO master.SubCategories(SubCategoryId,TenantId,CategoryId,SubCategoryName)
SELECT NEWID(),s.TenantId,s.CategoryId,s.SubCategoryName FROM (VALUES
    (@TenantId,@CatSh,'Derby'),(@TenantId,@CatSh,'Oxford'),(@TenantId,@CatSh,'Loafer'),
    (@TenantId,@CatSh,'Sneaker'),(@TenantId,@CatSh,'Sandal'),(@TenantId,@CatSh,'Boot'),
    (@TenantId,@CatBg,'Tote'),(@TenantId,@CatBg,'Clutch'),(@TenantId,@CatBg,'Backpack'),
    (@TenantId,@CatBg,'Briefcase'),(@TenantId,@CatBl,'Formal Belt'),(@TenantId,@CatBl,'Casual Belt')
) AS s(TenantId,CategoryId,SubCategoryName)
WHERE NOT EXISTS(SELECT 1 FROM master.SubCategories x WHERE x.CategoryId=s.CategoryId AND x.SubCategoryName=s.SubCategoryName);

INSERT INTO master.Colors(ColorId,TenantId,ColorName,ColorCode)
SELECT NEWID(),s.TenantId,s.ColorName,s.ColorCode FROM (VALUES
    (@TenantId,'Black','#000000'),(@TenantId,'Brown','#7B3F00'),(@TenantId,'Tan','#D2B48C'),
    (@TenantId,'Navy','#001F5B'),(@TenantId,'White','#FFFFFF'),(@TenantId,'Grey','#808080'),
    (@TenantId,'Burgundy','#800020'),(@TenantId,'Cognac','#9A4722'),(@TenantId,'Olive','#556B2F')
) AS s(TenantId,ColorName,ColorCode)
WHERE NOT EXISTS(SELECT 1 FROM master.Colors x WHERE x.TenantId=s.TenantId AND x.ColorName=s.ColorName);

INSERT INTO master.Styles(StyleId,TenantId,StyleName)
SELECT NEWID(),s.TenantId,s.StyleName FROM (VALUES
    (@TenantId,'Formal'),(@TenantId,'Casual'),(@TenantId,'Semi-Formal'),
    (@TenantId,'Sports'),(@TenantId,'Ethnic')
) AS s(TenantId,StyleName)
WHERE NOT EXISTS(SELECT 1 FROM master.Styles x WHERE x.TenantId=s.TenantId AND x.StyleName=s.StyleName);

INSERT INTO master.Fasteners(FastenerId,TenantId,FastenerName)
SELECT NEWID(),s.TenantId,s.FastenerName FROM (VALUES
    (@TenantId,'Lace-Up'),(@TenantId,'Slip-On'),(@TenantId,'Velcro'),
    (@TenantId,'Buckle'),(@TenantId,'Zip'),(@TenantId,'Chelsea'),(@TenantId,'Hook & Loop')
) AS s(TenantId,FastenerName)
WHERE NOT EXISTS(SELECT 1 FROM master.Fasteners x WHERE x.TenantId=s.TenantId AND x.FastenerName=s.FastenerName);
GO

-- ── 5.8  SIZE CHARTS ────────────────────────────────────────────────
DECLARE @TenantId UNIQUEIDENTIFIER; SELECT @TenantId=TenantId FROM auth.Tenants WHERE TenantCode='ELCURIO';
DECLARE @GenM UNIQUEIDENTIFIER; SELECT @GenM=GenderId FROM master.Genders WHERE TenantId=@TenantId AND GenderName='Men';
DECLARE @GenW UNIQUEIDENTIFIER; SELECT @GenW=GenderId FROM master.Genders WHERE TenantId=@TenantId AND GenderName='Women';

INSERT INTO master.SizeCharts(SizeChartId,TenantId,ChartType,GenderId,AgeGroup,USSize,EuroSize,UKSize,IndSize,CM)
SELECT NEWID(),s.TenantId,s.ChartType,s.GenderId,s.AgeGroup,s.USSize,s.EuroSize,s.UKSize,s.IndSize,s.CM
FROM (VALUES
    (@TenantId,'Footwear',@GenM,'Adult', 6.5, 39, 6.0,  6.0, 24.8),
    (@TenantId,'Footwear',@GenM,'Adult', 7.0, 40, 6.5,  6.5, 25.4),
    (@TenantId,'Footwear',@GenM,'Adult', 7.5, 41, 7.0,  7.0, 26.0),
    (@TenantId,'Footwear',@GenM,'Adult', 8.0, 42, 7.5,  7.5, 26.7),
    (@TenantId,'Footwear',@GenM,'Adult', 8.5, 43, 8.0,  8.0, 27.3),
    (@TenantId,'Footwear',@GenM,'Adult', 9.5, 44, 9.0,  9.0, 28.0),
    (@TenantId,'Footwear',@GenM,'Adult',10.5, 45,10.0, 10.0, 28.6),
    (@TenantId,'Footwear',@GenM,'Adult',11.5, 46,11.0, 11.0, 29.2),
    (@TenantId,'Footwear',@GenW,'Adult', 5.0, 35, 2.5,  2.5, 22.5),
    (@TenantId,'Footwear',@GenW,'Adult', 5.5, 36, 3.0,  3.0, 23.0),
    (@TenantId,'Footwear',@GenW,'Adult', 6.0, 37, 4.0,  4.0, 23.8),
    (@TenantId,'Footwear',@GenW,'Adult', 6.5, 38, 4.5,  4.5, 24.1),
    (@TenantId,'Footwear',@GenW,'Adult', 7.5, 39, 5.5,  5.5, 25.0),
    (@TenantId,'Footwear',@GenW,'Adult', 8.5, 40, 6.5,  6.5, 25.7),
    (@TenantId,'Footwear',@GenW,'Adult', 9.5, 41, 7.5,  7.5, 26.2)
) AS s(TenantId,ChartType,GenderId,AgeGroup,USSize,EuroSize,UKSize,IndSize,CM)
WHERE NOT EXISTS(SELECT 1 FROM master.SizeCharts x WHERE x.TenantId=s.TenantId AND x.GenderId=s.GenderId AND x.EuroSize=s.EuroSize AND x.ChartType=s.ChartType);
GO

-- ── 5.9  ARTICLES ───────────────────────────────────────────────────
DECLARE @TenantId UNIQUEIDENTIFIER; SELECT @TenantId=TenantId FROM auth.Tenants WHERE TenantCode='ELCURIO';
DECLARE @BCS UNIQUEIDENTIFIER; SELECT @BCS=BrandId FROM master.Brands WHERE TenantId=@TenantId AND BrandName='ClassicStep';
DECLARE @BRF UNIQUEIDENTIFIER; SELECT @BRF=BrandId FROM master.Brands WHERE TenantId=@TenantId AND BrandName='RunFast';
DECLARE @BUS UNIQUEIDENTIFIER; SELECT @BUS=BrandId FROM master.Brands WHERE TenantId=@TenantId AND BrandName='UrbanStep';
DECLARE @BBC UNIQUEIDENTIFIER; SELECT @BBC=BrandId FROM master.Brands WHERE TenantId=@TenantId AND BrandName='BagCraft';
DECLARE @BBK UNIQUEIDENTIFIER; SELECT @BBK=BrandId FROM master.Brands WHERE TenantId=@TenantId AND BrandName='BeltKing';
DECLARE @SegFW UNIQUEIDENTIFIER; SELECT @SegFW=SegmentId FROM master.Segments WHERE TenantId=@TenantId AND SegmentName='Footwear';
DECLARE @SegLG UNIQUEIDENTIFIER; SELECT @SegLG=SegmentId FROM master.Segments WHERE TenantId=@TenantId AND SegmentName='Leather Goods';
DECLARE @CatSh UNIQUEIDENTIFIER; SELECT @CatSh=CategoryId FROM master.Categories WHERE TenantId=@TenantId AND CategoryName='Shoes';
DECLARE @CatBg UNIQUEIDENTIFIER; SELECT @CatBg=CategoryId FROM master.Categories WHERE TenantId=@TenantId AND CategoryName='Bags';
DECLARE @CatBl UNIQUEIDENTIFIER; SELECT @CatBl=CategoryId FROM master.Categories WHERE TenantId=@TenantId AND CategoryName='Belts';
DECLARE @GrpCL UNIQUEIDENTIFIER; SELECT @GrpCL=GroupId FROM master.Groups WHERE TenantId=@TenantId AND GroupName='Classic Collection';
DECLARE @GrpUB UNIQUEIDENTIFIER; SELECT @GrpUB=GroupId FROM master.Groups WHERE TenantId=@TenantId AND GroupName='Urban Collection';
DECLARE @GrpEX UNIQUEIDENTIFIER; SELECT @GrpEX=GroupId FROM master.Groups WHERE TenantId=@TenantId AND GroupName='Executive Collection';
DECLARE @GrpSP UNIQUEIDENTIFIER; SELECT @GrpSP=GroupId FROM master.Groups WHERE TenantId=@TenantId AND GroupName='Sport Collection';
DECLARE @GenM  UNIQUEIDENTIFIER; SELECT @GenM =GenderId FROM master.Genders WHERE TenantId=@TenantId AND GenderName='Men';
DECLARE @GenW  UNIQUEIDENTIFIER; SELECT @GenW =GenderId FROM master.Genders WHERE TenantId=@TenantId AND GenderName='Women';
DECLARE @GenU  UNIQUEIDENTIFIER; SELECT @GenU =GenderId FROM master.Genders WHERE TenantId=@TenantId AND GenderName='Unisex';
DECLARE @SeaAW25 UNIQUEIDENTIFIER; SELECT @SeaAW25=SeasonId FROM master.Seasons WHERE TenantId=@TenantId AND SeasonCode='AW25';
DECLARE @SeaSS25 UNIQUEIDENTIFIER; SELECT @SeaSS25=SeasonId FROM master.Seasons WHERE TenantId=@TenantId AND SeasonCode='SS25';
DECLARE @SsFormal   UNIQUEIDENTIFIER; SELECT @SsFormal   =SubSegmentId FROM master.SubSegments WHERE SegmentId=@SegFW AND SubSegmentName='Formal';
DECLARE @SsCasual   UNIQUEIDENTIFIER; SELECT @SsCasual   =SubSegmentId FROM master.SubSegments WHERE SegmentId=@SegFW AND SubSegmentName='Casual';
DECLARE @SsSports   UNIQUEIDENTIFIER; SELECT @SsSports   =SubSegmentId FROM master.SubSegments WHERE SegmentId=@SegFW AND SubSegmentName='Sports';
DECLARE @SsHandbags UNIQUEIDENTIFIER; SELECT @SsHandbags =SubSegmentId FROM master.SubSegments WHERE SegmentId=@SegLG AND SubSegmentName='Handbags';
DECLARE @SsAccessory UNIQUEIDENTIFIER; SELECT @SsAccessory=SubSegmentId FROM master.SubSegments WHERE SegmentId=@SegLG AND SubSegmentName='Accessories';
DECLARE @ScDerby    UNIQUEIDENTIFIER; SELECT @ScDerby    =SubCategoryId FROM master.SubCategories WHERE CategoryId=@CatSh AND SubCategoryName='Derby';
DECLARE @ScOxford   UNIQUEIDENTIFIER; SELECT @ScOxford   =SubCategoryId FROM master.SubCategories WHERE CategoryId=@CatSh AND SubCategoryName='Oxford';
DECLARE @ScLoafer   UNIQUEIDENTIFIER; SELECT @ScLoafer   =SubCategoryId FROM master.SubCategories WHERE CategoryId=@CatSh AND SubCategoryName='Loafer';
DECLARE @ScSneaker  UNIQUEIDENTIFIER; SELECT @ScSneaker  =SubCategoryId FROM master.SubCategories WHERE CategoryId=@CatSh AND SubCategoryName='Sneaker';
DECLARE @ScTote     UNIQUEIDENTIFIER; SELECT @ScTote     =SubCategoryId FROM master.SubCategories WHERE CategoryId=@CatBg AND SubCategoryName='Tote';
DECLARE @ScBriefcase UNIQUEIDENTIFIER; SELECT @ScBriefcase=SubCategoryId FROM master.SubCategories WHERE CategoryId=@CatBg AND SubCategoryName='Briefcase';
DECLARE @ScFormalBelt UNIQUEIDENTIFIER; SELECT @ScFormalBelt=SubCategoryId FROM master.SubCategories WHERE CategoryId=@CatBl AND SubCategoryName='Formal Belt';

IF NOT EXISTS(SELECT 1 FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='CS-DRB-001')
INSERT INTO product.Articles(TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
VALUES(@TenantId,'CS-DRB-001','ClassicStep Executive Derby - Black',@BCS,@SegFW,@SsFormal,@CatSh,@ScDerby,@GrpEX,@SeaAW25,@GenM,'Black','Formal','Lace-Up','64039990','PAIRS',3995.00,2200.00,1,'2025-09-01');

IF NOT EXISTS(SELECT 1 FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='CS-DRB-002')
INSERT INTO product.Articles(TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
VALUES(@TenantId,'CS-DRB-002','ClassicStep Executive Derby - Brown',@BCS,@SegFW,@SsFormal,@CatSh,@ScDerby,@GrpEX,@SeaAW25,@GenM,'Brown','Formal','Lace-Up','64039990','PAIRS',3995.00,2200.00,1,'2025-09-01');

IF NOT EXISTS(SELECT 1 FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='CS-OXF-001')
INSERT INTO product.Articles(TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
VALUES(@TenantId,'CS-OXF-001','ClassicStep Classic Oxford - Black',@BCS,@SegFW,@SsFormal,@CatSh,@ScOxford,@GrpCL,@SeaAW25,@GenM,'Black','Formal','Lace-Up','64039990','PAIRS',4495.00,2500.00,1,'2025-09-01');

IF NOT EXISTS(SELECT 1 FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='US-LOA-001')
INSERT INTO product.Articles(TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
VALUES(@TenantId,'US-LOA-001','UrbanStep Casual Loafer - Tan',@BUS,@SegFW,@SsCasual,@CatSh,@ScLoafer,@GrpUB,@SeaSS25,@GenM,'Tan','Casual','Slip-On','64039990','PAIRS',2995.00,1600.00,1,'2025-03-01');

IF NOT EXISTS(SELECT 1 FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='US-LOA-002')
INSERT INTO product.Articles(TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
VALUES(@TenantId,'US-LOA-002','UrbanStep Casual Loafer - Navy',@BUS,@SegFW,@SsCasual,@CatSh,@ScLoafer,@GrpUB,@SeaSS25,@GenW,'Navy','Casual','Slip-On','64039990','PAIRS',2795.00,1500.00,1,'2025-03-01');

IF NOT EXISTS(SELECT 1 FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='RF-SNK-001')
INSERT INTO product.Articles(TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
VALUES(@TenantId,'RF-SNK-001','RunFast Sport Sneaker - White',@BRF,@SegFW,@SsSports,@CatSh,@ScSneaker,@GrpSP,@SeaSS25,@GenU,'White','Sports','Lace-Up','64041990','PAIRS',3495.00,1800.00,1,'2025-03-01');

IF NOT EXISTS(SELECT 1 FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='RF-SNK-002')
INSERT INTO product.Articles(TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
VALUES(@TenantId,'RF-SNK-002','RunFast Sport Sneaker - Black',@BRF,@SegFW,@SsSports,@CatSh,@ScSneaker,@GrpSP,@SeaSS25,@GenU,'Black','Sports','Lace-Up','64041990','PAIRS',3495.00,1800.00,1,'2025-03-01');

IF NOT EXISTS(SELECT 1 FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='BC-TOT-001')
INSERT INTO product.Articles(TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
VALUES(@TenantId,'BC-TOT-001','BagCraft Executive Tote - Black',@BBC,@SegLG,@SsHandbags,@CatBg,@ScTote,@GrpEX,@SeaAW25,@GenW,'Black','Formal','Zip','42021290','PCS',5995.00,3200.00,0,'2025-09-01');

IF NOT EXISTS(SELECT 1 FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='BC-BRF-001')
INSERT INTO product.Articles(TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
VALUES(@TenantId,'BC-BRF-001','BagCraft Leather Briefcase - Brown',@BBC,@SegLG,@SsHandbags,@CatBg,@ScBriefcase,@GrpEX,@SeaAW25,@GenM,'Brown','Formal','Buckle','42021290','PCS',7995.00,4200.00,0,'2025-09-01');

IF NOT EXISTS(SELECT 1 FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='BK-BLT-001')
INSERT INTO product.Articles(TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
VALUES(@TenantId,'BK-BLT-001','BeltKing Formal Leather Belt - Black',@BBK,@SegLG,@SsAccessory,@CatBl,@ScFormalBelt,@GrpCL,@SeaAW25,@GenM,'Black','Formal','Buckle','42033000','PCS',1295.00,650.00,0,'2025-09-01');

IF NOT EXISTS(SELECT 1 FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='BK-BLT-002')
INSERT INTO product.Articles(TenantId,ArticleCode,ArticleName,BrandId,SegmentId,SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,Color,Style,Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,LaunchDate)
VALUES(@TenantId,'BK-BLT-002','BeltKing Formal Leather Belt - Brown',@BBK,@SegLG,@SsAccessory,@CatBl,@ScFormalBelt,@GrpCL,@SeaAW25,@GenM,'Brown','Formal','Buckle','42033000','PCS',1295.00,650.00,0,'2025-09-01');
GO

-- ── 5.10  ARTICLE SIZES & FOOTWEAR DETAILS ──────────────────────────
DECLARE @TenantId UNIQUEIDENTIFIER; SELECT @TenantId=TenantId FROM auth.Tenants WHERE TenantCode='ELCURIO';

-- Men's sizes 39-46 for Derby/Oxford/Loafer-M/Sneakers
DECLARE @MenSizes TABLE(EuroSize INT,UKSize DECIMAL(5,1),USSize DECIMAL(5,1));
INSERT INTO @MenSizes VALUES(39,6.0,6.5),(40,6.5,7.0),(41,7.0,7.5),(42,7.5,8.0),(43,8.0,8.5),(44,9.0,9.5),(45,10.0,10.5),(46,11.0,11.5);

INSERT INTO product.ArticleSizes(ArticleSizeId,ArticleId,EuroSize,UKSize,USSize,MRP)
SELECT NEWID(),a.ArticleId,s.EuroSize,s.UKSize,s.USSize,a.MRP
FROM product.Articles a CROSS JOIN @MenSizes s
WHERE a.TenantId=@TenantId AND a.ArticleCode IN ('CS-DRB-001','CS-DRB-002','CS-OXF-001','US-LOA-001','RF-SNK-001','RF-SNK-002')
AND NOT EXISTS(SELECT 1 FROM product.ArticleSizes x WHERE x.ArticleId=a.ArticleId AND x.EuroSize=s.EuroSize);

-- Women's sizes 35-41 for Women's Loafer
DECLARE @WomenSizes TABLE(EuroSize INT,UKSize DECIMAL(5,1),USSize DECIMAL(5,1));
INSERT INTO @WomenSizes VALUES(35,2.5,5.0),(36,3.0,5.5),(37,4.0,6.0),(38,4.5,6.5),(39,5.5,7.5),(40,6.5,8.5),(41,7.5,9.5);

INSERT INTO product.ArticleSizes(ArticleSizeId,ArticleId,EuroSize,UKSize,USSize,MRP)
SELECT NEWID(),a.ArticleId,s.EuroSize,s.UKSize,s.USSize,a.MRP
FROM product.Articles a CROSS JOIN @WomenSizes s
WHERE a.TenantId=@TenantId AND a.ArticleCode='US-LOA-002'
AND NOT EXISTS(SELECT 1 FROM product.ArticleSizes x WHERE x.ArticleId=a.ArticleId AND x.EuroSize=s.EuroSize);

-- FootwearDetails
DECLARE @AId UNIQUEIDENTIFIER;
SELECT @AId=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='CS-DRB-001';
IF NOT EXISTS(SELECT 1 FROM product.FootwearDetails WHERE ArticleId=@AId) INSERT INTO product.FootwearDetails(ArticleId,Last,UpperLeather,LiningLeather,Sole,SizeRunFrom,SizeRunTo) VALUES(@AId,'806','Full Grain Cow Leather','Pig Leather Lining','TPR Sole',39,46);
SELECT @AId=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='CS-DRB-002';
IF NOT EXISTS(SELECT 1 FROM product.FootwearDetails WHERE ArticleId=@AId) INSERT INTO product.FootwearDetails(ArticleId,Last,UpperLeather,LiningLeather,Sole,SizeRunFrom,SizeRunTo) VALUES(@AId,'806','Full Grain Cow Leather','Pig Leather Lining','TPR Sole',39,46);
SELECT @AId=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='CS-OXF-001';
IF NOT EXISTS(SELECT 1 FROM product.FootwearDetails WHERE ArticleId=@AId) INSERT INTO product.FootwearDetails(ArticleId,Last,UpperLeather,LiningLeather,Sole,SizeRunFrom,SizeRunTo) VALUES(@AId,'904','Full Grain Cow Leather','Soft Leather Lining','Leather Sole',39,46);
SELECT @AId=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='US-LOA-001';
IF NOT EXISTS(SELECT 1 FROM product.FootwearDetails WHERE ArticleId=@AId) INSERT INTO product.FootwearDetails(ArticleId,Last,UpperLeather,LiningLeather,Sole,SizeRunFrom,SizeRunTo) VALUES(@AId,'702','Nubuck Leather','Mesh Lining','Rubber Sole',39,46);
SELECT @AId=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='US-LOA-002';
IF NOT EXISTS(SELECT 1 FROM product.FootwearDetails WHERE ArticleId=@AId) INSERT INTO product.FootwearDetails(ArticleId,Last,UpperLeather,LiningLeather,Sole,SizeRunFrom,SizeRunTo) VALUES(@AId,'702','Nubuck Leather','Mesh Lining','Rubber Sole',35,41);
SELECT @AId=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='RF-SNK-001';
IF NOT EXISTS(SELECT 1 FROM product.FootwearDetails WHERE ArticleId=@AId) INSERT INTO product.FootwearDetails(ArticleId,Last,UpperLeather,LiningLeather,Sole,SizeRunFrom,SizeRunTo) VALUES(@AId,'501','Synthetic Upper','Mesh Lining','EVA+Rubber Sole',39,46);
SELECT @AId=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='RF-SNK-002';
IF NOT EXISTS(SELECT 1 FROM product.FootwearDetails WHERE ArticleId=@AId) INSERT INTO product.FootwearDetails(ArticleId,Last,UpperLeather,LiningLeather,Sole,SizeRunFrom,SizeRunTo) VALUES(@AId,'501','Synthetic Upper','Mesh Lining','EVA+Rubber Sole',39,46);

-- LeatherGoodsDetails
SELECT @AId=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='BC-TOT-001';
IF NOT EXISTS(SELECT 1 FROM product.LeatherGoodsDetails WHERE ArticleId=@AId) INSERT INTO product.LeatherGoodsDetails(ArticleId,Dimensions,Security) VALUES(@AId,'40cm x 30cm x 12cm','Metal Zip + Magnetic Clasp');
SELECT @AId=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='BC-BRF-001';
IF NOT EXISTS(SELECT 1 FROM product.LeatherGoodsDetails WHERE ArticleId=@AId) INSERT INTO product.LeatherGoodsDetails(ArticleId,Dimensions,Security) VALUES(@AId,'45cm x 32cm x 10cm','Combination Lock + Zip');
GO

-- ── 5.11  CLIENTS & STORES ──────────────────────────────────────────
DECLARE @TenantId UNIQUEIDENTIFIER; SELECT @TenantId=TenantId FROM auth.Tenants WHERE TenantCode='ELCURIO';

INSERT INTO sales.Clients(ClientId,TenantId,ClientCode,ClientName,Organisation,GSTIN,StateId,StateCode,Zone,Email,ContactNo,MarginPercent,MarginType)
SELECT NEWID(),s.TenantId,s.CC,s.CN,s.Org,s.GSTIN,s.StateId,s.SC,s.Zone,s.Email,s.Phone,s.Margin,'NET OF TAXES'
FROM (VALUES
    (@TenantId,'CLT-001','VISION FOOTWEAR','Vision Retail Pvt Ltd','27ABCPV1234A1Z1',27,'27','WEST','vision@retail.com','9811001001',30.00),
    (@TenantId,'CLT-002','METRO SHOES','Metro Brands Ltd','29AAAMB5678B1Z2',29,'29','SOUTH','metro@brands.com','9822002002',28.00),
    (@TenantId,'CLT-003','LIBERTY SHOES','Liberty Shoes Ltd','07AALCL3456C1Z3',7,'07','NORTH','liberty@shoes.in','9833003003',25.00),
    (@TenantId,'CLT-004','BEST WALK','Best Walk Retail LLP','33AACFB7890D1Z4',33,'33','SOUTH','bestwalk@retail.in','9844004004',27.00),
    (@TenantId,'CLT-005','EAST INDIA FOOTWEAR','East India Footwear Co','19AADFE2345E1Z5',19,'19','EAST','eifw@gmail.com','9855005005',22.00)
) AS s(TenantId,CC,CN,Org,GSTIN,StateId,SC,Zone,Email,Phone,Margin)
WHERE NOT EXISTS(SELECT 1 FROM sales.Clients c WHERE c.TenantId=s.TenantId AND c.ClientCode=s.CC);

DECLARE @CLT001 UNIQUEIDENTIFIER; SELECT @CLT001=ClientId FROM sales.Clients WHERE TenantId=@TenantId AND ClientCode='CLT-001';
DECLARE @CLT002 UNIQUEIDENTIFIER; SELECT @CLT002=ClientId FROM sales.Clients WHERE TenantId=@TenantId AND ClientCode='CLT-002';
DECLARE @CLT003 UNIQUEIDENTIFIER; SELECT @CLT003=ClientId FROM sales.Clients WHERE TenantId=@TenantId AND ClientCode='CLT-003';
DECLARE @CLT004 UNIQUEIDENTIFIER; SELECT @CLT004=ClientId FROM sales.Clients WHERE TenantId=@TenantId AND ClientCode='CLT-004';
DECLARE @CLT005 UNIQUEIDENTIFIER; SELECT @CLT005=ClientId FROM sales.Clients WHERE TenantId=@TenantId AND ClientCode='CLT-005';

INSERT INTO sales.Stores(StoreId,TenantId,ClientId,StoreCode,StoreName,City,State,Channel,GSTIN,MarginPercent,MarginType)
SELECT NEWID(),s.TenantId,s.ClientId,s.SC,s.SN,s.City,s.State,s.Channel,s.GSTIN,s.Margin,'NET OF TAXES'
FROM (VALUES
    (@TenantId,@CLT001,'STR-001','Vision Mumbai MG Road','Mumbai','Maharashtra','EBO','27ABCPV1234A1Z1',30.00),
    (@TenantId,@CLT001,'STR-002','Vision Pune FC Road','Pune','Maharashtra','EBO','27ABCPV1234A1Z1',28.00),
    (@TenantId,@CLT002,'STR-003','Metro Bangalore Indiranagar','Bangalore','Karnataka','EBO','29AAAMB5678B1Z2',28.00),
    (@TenantId,@CLT002,'STR-004','Metro Hyderabad Jubilee Hills','Hyderabad','Telangana','EBO','29AAAMB5678B1Z2',27.00),
    (@TenantId,@CLT003,'STR-005','Liberty Delhi Connaught Place','New Delhi','Delhi','EBO','07AALCL3456C1Z3',25.00),
    (@TenantId,@CLT004,'STR-006','Best Walk Chennai Anna Nagar','Chennai','Tamil Nadu','MBO','33AACFB7890D1Z4',27.00),
    (@TenantId,@CLT005,'STR-007','EIFW Kolkata Park Street','Kolkata','West Bengal','MBO','19AADFE2345E1Z5',22.00)
) AS s(TenantId,ClientId,SC,SN,City,State,Channel,GSTIN,Margin)
WHERE NOT EXISTS(SELECT 1 FROM sales.Stores st WHERE st.TenantId=s.TenantId AND st.StoreCode=s.SC);
GO

-- ── 5.12  PRODUCTION ORDERS ─────────────────────────────────────────
DECLARE @TenantId UNIQUEIDENTIFIER; SELECT @TenantId=TenantId FROM auth.Tenants WHERE TenantCode='ELCURIO';
DECLARE @Art1 UNIQUEIDENTIFIER; SELECT @Art1=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='CS-DRB-001';
DECLARE @Art2 UNIQUEIDENTIFIER; SELECT @Art2=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='CS-DRB-002';
DECLARE @Art3 UNIQUEIDENTIFIER; SELECT @Art3=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='RF-SNK-001';

DECLARE @PO1 UNIQUEIDENTIFIER;
IF NOT EXISTS(SELECT 1 FROM production.ProductionOrders WHERE TenantId=@TenantId AND OrderNo='PO-2025-001') BEGIN
    SET @PO1=NEWID();
    INSERT INTO production.ProductionOrders(ProductionOrderId,TenantId,OrderNo,ArticleId,OrderDate,Color,OrderType,TotalQuantity,Status,CompletedAt)
    VALUES(@PO1,@TenantId,'PO-2025-001',@Art1,'2025-07-01','Black','REPLENISHMENT',480,'COMPLETED','2025-08-30');
    INSERT INTO production.ProductionSizeRuns(SizeRunId,ProductionOrderId,EuroSize,Quantity,ProducedQty) VALUES
    (NEWID(),@PO1,39,40,40),(NEWID(),@PO1,40,60,60),(NEWID(),@PO1,41,80,80),(NEWID(),@PO1,42,100,100),
    (NEWID(),@PO1,43,80,80),(NEWID(),@PO1,44,60,60),(NEWID(),@PO1,45,40,40),(NEWID(),@PO1,46,20,20);
END

DECLARE @PO2 UNIQUEIDENTIFIER;
IF NOT EXISTS(SELECT 1 FROM production.ProductionOrders WHERE TenantId=@TenantId AND OrderNo='PO-2025-002') BEGIN
    SET @PO2=NEWID();
    INSERT INTO production.ProductionOrders(ProductionOrderId,TenantId,OrderNo,ArticleId,OrderDate,Color,OrderType,TotalQuantity,Status,CompletedAt)
    VALUES(@PO2,@TenantId,'PO-2025-002',@Art2,'2025-07-15','Brown','REPLENISHMENT',360,'COMPLETED','2025-09-15');
    INSERT INTO production.ProductionSizeRuns(SizeRunId,ProductionOrderId,EuroSize,Quantity,ProducedQty) VALUES
    (NEWID(),@PO2,39,30,30),(NEWID(),@PO2,40,50,50),(NEWID(),@PO2,41,60,60),(NEWID(),@PO2,42,80,80),
    (NEWID(),@PO2,43,60,60),(NEWID(),@PO2,44,50,50),(NEWID(),@PO2,45,20,20),(NEWID(),@PO2,46,10,10);
END

DECLARE @PO3 UNIQUEIDENTIFIER;
IF NOT EXISTS(SELECT 1 FROM production.ProductionOrders WHERE TenantId=@TenantId AND OrderNo='PO-2025-003') BEGIN
    SET @PO3=NEWID();
    INSERT INTO production.ProductionOrders(ProductionOrderId,TenantId,OrderNo,ArticleId,OrderDate,Color,OrderType,TotalQuantity,Status)
    VALUES(@PO3,@TenantId,'PO-2025-003',@Art3,'2025-09-01','White','REPLENISHMENT',320,'IN_PRODUCTION');
    INSERT INTO production.ProductionSizeRuns(SizeRunId,ProductionOrderId,EuroSize,Quantity,ProducedQty) VALUES
    (NEWID(),@PO3,39,30,20),(NEWID(),@PO3,40,50,30),(NEWID(),@PO3,41,60,40),(NEWID(),@PO3,42,80,50),
    (NEWID(),@PO3,43,60,30),(NEWID(),@PO3,44,20,10),(NEWID(),@PO3,45,15,5),(NEWID(),@PO3,46,5,0);
END
GO

-- ── 5.13  GRN & STOCK ───────────────────────────────────────────────
DECLARE @TenantId UNIQUEIDENTIFIER; SELECT @TenantId=TenantId FROM auth.Tenants WHERE TenantCode='ELCURIO';
DECLARE @WHMH UNIQUEIDENTIFIER; SELECT @WHMH=WarehouseId FROM warehouse.Warehouses WHERE TenantId=@TenantId AND WarehouseCode='WH-MH';
DECLARE @Art1 UNIQUEIDENTIFIER; SELECT @Art1=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='CS-DRB-001';
DECLARE @Art2 UNIQUEIDENTIFIER; SELECT @Art2=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='CS-DRB-002';
DECLARE @Art3 UNIQUEIDENTIFIER; SELECT @Art3=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='RF-SNK-001';

DECLARE @GRN1 UNIQUEIDENTIFIER;
IF NOT EXISTS(SELECT 1 FROM inventory.GoodsReceivedNotes WHERE TenantId=@TenantId AND GRNNumber='GRN-2025-001') BEGIN
    SET @GRN1=NEWID();
    INSERT INTO inventory.GoodsReceivedNotes(GRNId,TenantId,GRNNumber,WarehouseId,ReceiptDate,SourceType,Status,TotalQuantity)
    VALUES(@GRN1,@TenantId,'GRN-2025-001',@WHMH,'2025-09-05','Production','Confirmed',480);
    INSERT INTO inventory.GRNLines(GRNLineId,GRNId,ArticleId,EuroSize,Quantity) VALUES
    (NEWID(),@GRN1,@Art1,39,40),(NEWID(),@GRN1,@Art1,40,60),(NEWID(),@GRN1,@Art1,41,80),
    (NEWID(),@GRN1,@Art1,42,100),(NEWID(),@GRN1,@Art1,43,80),(NEWID(),@GRN1,@Art1,44,60),
    (NEWID(),@GRN1,@Art1,45,40),(NEWID(),@GRN1,@Art1,46,20);
    -- Stock ledger
    MERGE inventory.StockLedger AS tgt
    USING(SELECT s.EuroSize,s.Qty FROM(VALUES(39,40),(40,60),(41,80),(42,100),(43,80),(44,60),(45,40),(46,20))AS s(EuroSize,Qty)) AS src ON tgt.TenantId=@TenantId AND tgt.WarehouseId=@WHMH AND tgt.ArticleId=@Art1 AND tgt.EuroSize=src.EuroSize
    WHEN MATCHED THEN UPDATE SET InwardQty=tgt.InwardQty+src.Qty,LastUpdated=SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT(StockLedgerId,TenantId,WarehouseId,ArticleId,EuroSize,OpeningStock,InwardQty,OutwardQty,LastUpdated) VALUES(NEWID(),@TenantId,@WHMH,@Art1,src.EuroSize,0,src.Qty,0,SYSUTCDATETIME());
END

DECLARE @GRN2 UNIQUEIDENTIFIER;
IF NOT EXISTS(SELECT 1 FROM inventory.GoodsReceivedNotes WHERE TenantId=@TenantId AND GRNNumber='GRN-2025-002') BEGIN
    SET @GRN2=NEWID();
    INSERT INTO inventory.GoodsReceivedNotes(GRNId,TenantId,GRNNumber,WarehouseId,ReceiptDate,SourceType,Status,TotalQuantity)
    VALUES(@GRN2,@TenantId,'GRN-2025-002',@WHMH,'2025-09-20','Production','Confirmed',360);
    INSERT INTO inventory.GRNLines(GRNLineId,GRNId,ArticleId,EuroSize,Quantity) VALUES
    (NEWID(),@GRN2,@Art2,39,30),(NEWID(),@GRN2,@Art2,40,50),(NEWID(),@GRN2,@Art2,41,60),
    (NEWID(),@GRN2,@Art2,42,80),(NEWID(),@GRN2,@Art2,43,60),(NEWID(),@GRN2,@Art2,44,50),
    (NEWID(),@GRN2,@Art2,45,20),(NEWID(),@GRN2,@Art2,46,10);
    MERGE inventory.StockLedger AS tgt
    USING(SELECT s.EuroSize,s.Qty FROM(VALUES(39,30),(40,50),(41,60),(42,80),(43,60),(44,50),(45,20),(46,10))AS s(EuroSize,Qty)) AS src ON tgt.TenantId=@TenantId AND tgt.WarehouseId=@WHMH AND tgt.ArticleId=@Art2 AND tgt.EuroSize=src.EuroSize
    WHEN MATCHED THEN UPDATE SET InwardQty=tgt.InwardQty+src.Qty,LastUpdated=SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT(StockLedgerId,TenantId,WarehouseId,ArticleId,EuroSize,OpeningStock,InwardQty,OutwardQty,LastUpdated) VALUES(NEWID(),@TenantId,@WHMH,@Art2,src.EuroSize,0,src.Qty,0,SYSUTCDATETIME());
END
GO

-- ── 5.14  CUSTOMER ORDERS ───────────────────────────────────────────
DECLARE @TenantId UNIQUEIDENTIFIER; SELECT @TenantId=TenantId FROM auth.Tenants WHERE TenantCode='ELCURIO';
DECLARE @WHMH UNIQUEIDENTIFIER; SELECT @WHMH=WarehouseId FROM warehouse.Warehouses WHERE TenantId=@TenantId AND WarehouseCode='WH-MH';
DECLARE @CLT001 UNIQUEIDENTIFIER; SELECT @CLT001=ClientId FROM sales.Clients WHERE TenantId=@TenantId AND ClientCode='CLT-001';
DECLARE @CLT002 UNIQUEIDENTIFIER; SELECT @CLT002=ClientId FROM sales.Clients WHERE TenantId=@TenantId AND ClientCode='CLT-002';
DECLARE @STR001 UNIQUEIDENTIFIER; SELECT @STR001=StoreId FROM sales.Stores WHERE TenantId=@TenantId AND StoreCode='STR-001';
DECLARE @STR003 UNIQUEIDENTIFIER; SELECT @STR003=StoreId FROM sales.Stores WHERE TenantId=@TenantId AND StoreCode='STR-003';
DECLARE @Art1 UNIQUEIDENTIFIER; SELECT @Art1=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='CS-DRB-001';
DECLARE @Art2 UNIQUEIDENTIFIER; SELECT @Art2=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='CS-DRB-002';

DECLARE @ORD1 UNIQUEIDENTIFIER;
IF NOT EXISTS(SELECT 1 FROM sales.CustomerOrders WHERE TenantId=@TenantId AND OrderNo='ORD-2025-001') BEGIN
    SET @ORD1=NEWID();
    INSERT INTO sales.CustomerOrders(OrderId,TenantId,OrderNo,ClientId,StoreId,WarehouseId,OrderDate,TotalQuantity,TotalMRP,TotalAmount,Status,ConfirmedAt)
    VALUES(@ORD1,@TenantId,'ORD-2025-001',@CLT001,@STR001,@WHMH,'2025-10-01',135,539325.00,539325.00,'CONFIRMED','2025-10-02');
    INSERT INTO sales.OrderLines(OrderLineId,OrderId,ArticleId,Color,EuroSize,HSNCode,MRP,Quantity,LineTotal) VALUES
    (NEWID(),@ORD1,@Art1,'Black',40,'64039990',3995.00,20,79900.00),(NEWID(),@ORD1,@Art1,'Black',41,'64039990',3995.00,25,99875.00),
    (NEWID(),@ORD1,@Art1,'Black',42,'64039990',3995.00,30,119850.00),(NEWID(),@ORD1,@Art1,'Black',43,'64039990',3995.00,25,99875.00),
    (NEWID(),@ORD1,@Art1,'Black',44,'64039990',3995.00,20,79900.00),(NEWID(),@ORD1,@Art1,'Black',45,'64039990',3995.00,15,59925.00);
END

DECLARE @ORD2 UNIQUEIDENTIFIER;
IF NOT EXISTS(SELECT 1 FROM sales.CustomerOrders WHERE TenantId=@TenantId AND OrderNo='ORD-2025-002') BEGIN
    SET @ORD2=NEWID();
    INSERT INTO sales.CustomerOrders(OrderId,TenantId,OrderNo,ClientId,StoreId,WarehouseId,OrderDate,TotalQuantity,TotalMRP,TotalAmount,Status,ConfirmedAt)
    VALUES(@ORD2,@TenantId,'ORD-2025-002',@CLT002,@STR003,@WHMH,'2025-10-10',120,478800.00,478800.00,'DISPATCHED','2025-10-12');
    INSERT INTO sales.OrderLines(OrderLineId,OrderId,ArticleId,Color,EuroSize,HSNCode,MRP,Quantity,LineTotal) VALUES
    (NEWID(),@ORD2,@Art2,'Brown',40,'64039990',3995.00,20,79900.00),(NEWID(),@ORD2,@Art2,'Brown',41,'64039990',3995.00,30,119850.00),
    (NEWID(),@ORD2,@Art2,'Brown',42,'64039990',3995.00,40,159800.00),(NEWID(),@ORD2,@Art2,'Brown',43,'64039990',3995.00,20,79900.00),
    (NEWID(),@ORD2,@Art2,'Brown',44,'64039990',3995.00,10,39950.00);
END
GO

-- ── 5.15  INVOICES ──────────────────────────────────────────────────
DECLARE @TenantId UNIQUEIDENTIFIER; SELECT @TenantId=TenantId FROM auth.Tenants WHERE TenantCode='ELCURIO';
DECLARE @CLT001 UNIQUEIDENTIFIER; SELECT @CLT001=ClientId FROM sales.Clients WHERE TenantId=@TenantId AND ClientCode='CLT-001';
DECLARE @CLT002 UNIQUEIDENTIFIER; SELECT @CLT002=ClientId FROM sales.Clients WHERE TenantId=@TenantId AND ClientCode='CLT-002';
DECLARE @STR001 UNIQUEIDENTIFIER; SELECT @STR001=StoreId FROM sales.Stores WHERE TenantId=@TenantId AND StoreCode='STR-001';
DECLARE @STR003 UNIQUEIDENTIFIER; SELECT @STR003=StoreId FROM sales.Stores WHERE TenantId=@TenantId AND StoreCode='STR-003';
DECLARE @ORD1   UNIQUEIDENTIFIER; SELECT @ORD1  =OrderId FROM sales.CustomerOrders WHERE TenantId=@TenantId AND OrderNo='ORD-2025-001';
DECLARE @ORD2   UNIQUEIDENTIFIER; SELECT @ORD2  =OrderId FROM sales.CustomerOrders WHERE TenantId=@TenantId AND OrderNo='ORD-2025-002';
DECLARE @Art1 UNIQUEIDENTIFIER; SELECT @Art1=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='CS-DRB-001';
DECLARE @Art2 UNIQUEIDENTIFIER; SELECT @Art2=ArticleId FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode='CS-DRB-002';

IF NOT EXISTS(SELECT 1 FROM billing.Invoices WHERE TenantId=@TenantId AND InvoiceNo='SKH/001/2526') BEGIN
    DECLARE @INV1 UNIQUEIDENTIFIER=NEWID();
    INSERT INTO billing.Invoices(InvoiceId,TenantId,InvoiceNo,InvoiceDate,ClientId,StoreId,OrderId,IsInterState,SalesType,
        TotalQuantity,SubTotal,TaxableAmount,CGSTAmount,SGSTAmount,IGSTAmount,TotalGST,TotalAmount,GrandTotal,NetPayable,Status)
    VALUES(@INV1,@TenantId,'SKH/001/2526','2025-10-15',@CLT001,@STR001,@ORD1,0,'Local',
        135,539325.00,379325.70,34139.31,34139.31,0.00,68278.62,447604.32,447604.32,447604.32,'Confirmed');
    INSERT INTO billing.InvoiceLines(InvoiceLineId,InvoiceId,LineNumber,ArticleId,ArticleCode,ArticleName,HSNCode,Color,EuroSize,UOM,Quantity,MRP,MarginPercent,MarginAmount,UnitPrice,TaxableAmount,GSTRate,CGSTRate,CGSTAmount,SGSTRate,SGSTAmount,IGSTRate,IGSTAmount,TotalAmount,LineTotal,TotalBilling) VALUES
    (NEWID(),@INV1,1,@Art1,'CS-DRB-001','ClassicStep Executive Derby - Black','64039990','Black',40,'PAIRS',20,3995.00,30.00,1198.50,2796.50,55930.00,18.00,9.00,5033.70,9.00,5033.70,0,0,65997.40,65997.40,65997.40),
    (NEWID(),@INV1,2,@Art1,'CS-DRB-001','ClassicStep Executive Derby - Black','64039990','Black',41,'PAIRS',25,3995.00,30.00,1198.50,2796.50,69912.50,18.00,9.00,6292.13,9.00,6292.13,0,0,82496.76,82496.76,82496.76),
    (NEWID(),@INV1,3,@Art1,'CS-DRB-001','ClassicStep Executive Derby - Black','64039990','Black',42,'PAIRS',30,3995.00,30.00,1198.50,2796.50,83895.00,18.00,9.00,7550.55,9.00,7550.55,0,0,98996.10,98996.10,98996.10),
    (NEWID(),@INV1,4,@Art1,'CS-DRB-001','ClassicStep Executive Derby - Black','64039990','Black',43,'PAIRS',25,3995.00,30.00,1198.50,2796.50,69912.50,18.00,9.00,6292.13,9.00,6292.13,0,0,82496.76,82496.76,82496.76),
    (NEWID(),@INV1,5,@Art1,'CS-DRB-001','ClassicStep Executive Derby - Black','64039990','Black',44,'PAIRS',20,3995.00,30.00,1198.50,2796.50,55930.00,18.00,9.00,5033.70,9.00,5033.70,0,0,65997.40,65997.40,65997.40),
    (NEWID(),@INV1,6,@Art1,'CS-DRB-001','ClassicStep Executive Derby - Black','64039990','Black',45,'PAIRS',15,3995.00,30.00,1198.50,2796.50,41947.50,18.00,9.00,3775.28,9.00,3775.28,0,0,49498.06,49498.06,49498.06);
END

IF NOT EXISTS(SELECT 1 FROM billing.Invoices WHERE TenantId=@TenantId AND InvoiceNo='SKH/002/2526') BEGIN
    DECLARE @INV2 UNIQUEIDENTIFIER=NEWID();
    INSERT INTO billing.Invoices(InvoiceId,TenantId,InvoiceNo,InvoiceDate,ClientId,StoreId,OrderId,IsInterState,SalesType,
        TotalQuantity,SubTotal,TaxableAmount,CGSTAmount,SGSTAmount,IGSTAmount,TotalGST,TotalAmount,GrandTotal,NetPayable,Status)
    VALUES(@INV2,@TenantId,'SKH/002/2526','2025-10-16',@CLT002,@STR003,@ORD2,1,'Interstate',
        120,478800.00,335160.00,0,0,60328.80,60328.80,395488.80,395488.80,395488.80,'Confirmed');
    INSERT INTO billing.InvoiceLines(InvoiceLineId,InvoiceId,LineNumber,ArticleId,ArticleCode,ArticleName,HSNCode,Color,EuroSize,UOM,Quantity,MRP,MarginPercent,MarginAmount,UnitPrice,TaxableAmount,GSTRate,CGSTRate,CGSTAmount,SGSTRate,SGSTAmount,IGSTRate,IGSTAmount,TotalAmount,LineTotal,TotalBilling) VALUES
    (NEWID(),@INV2,1,@Art2,'CS-DRB-002','ClassicStep Executive Derby - Brown','64039990','Brown',40,'PAIRS',20,3995.00,30.00,1198.50,2796.50,55930.00,18.00,0,0,0,0,18.00,10067.40,65997.40,65997.40,65997.40),
    (NEWID(),@INV2,2,@Art2,'CS-DRB-002','ClassicStep Executive Derby - Brown','64039990','Brown',41,'PAIRS',30,3995.00,30.00,1198.50,2796.50,83895.00,18.00,0,0,0,0,18.00,15101.10,98996.10,98996.10,98996.10),
    (NEWID(),@INV2,3,@Art2,'CS-DRB-002','ClassicStep Executive Derby - Brown','64039990','Brown',42,'PAIRS',40,3995.00,30.00,1198.50,2796.50,111860.00,18.00,0,0,0,0,18.00,20134.80,131994.80,131994.80,131994.80),
    (NEWID(),@INV2,4,@Art2,'CS-DRB-002','ClassicStep Executive Derby - Brown','64039990','Brown',43,'PAIRS',20,3995.00,30.00,1198.50,2796.50,55930.00,18.00,0,0,0,0,18.00,10067.40,65997.40,65997.40,65997.40),
    (NEWID(),@INV2,5,@Art2,'CS-DRB-002','ClassicStep Executive Derby - Brown','64039990','Brown',44,'PAIRS',10,3995.00,30.00,1198.50,2796.50,27965.00,18.00,0,0,0,0,18.00,5033.70,32998.70,32998.70,32998.70);
END
GO

-- ── 5.16  TENANT SETTINGS ────────────────────────────────────────────
DECLARE @TenantId UNIQUEIDENTIFIER; SELECT @TenantId=TenantId FROM auth.Tenants WHERE TenantCode='ELCURIO';
IF NOT EXISTS(SELECT 1 FROM auth.TenantSettings WHERE TenantId=@TenantId)
INSERT INTO auth.TenantSettings(SettingsId,TenantId,CompanyName,TradeName,GSTIN,PAN,
    AddressLine1,AddressLine2,City,State,Pincode,Phone,Email,
    BankName,BankBranch,BankAccountNo,BankIFSCode,
    GSTRegType,InvoicePrefix,FYStartMonth,AuthorisedSignatory)
VALUES(NEWID(),@TenantId,'EL CURIO ENTERPRISES PVT LTD','EL CURIO','27AABCE1234F1Z5','AABCE1234F',
    'Plot No. 17, Sector 5, Industrial Area','MIDC Bhiwandi','Mumbai','Maharashtra','421302',
    '9876543210','info@elcurio.com',
    'HDFC Bank','BHIWANDI MIDC BRANCH','50200123456789','HDFC0001234',
    'Regular','SKH',4,'Rajesh Kumar');
GO

PRINT '>> PART 5: Seed data inserted.';
GO
