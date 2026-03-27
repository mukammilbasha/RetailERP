-- ============================================================
-- RetailERP - FILE 1 OF 3: Database + Schemas + All Tables
-- EL CURIO Multi-Tenant Retail Distribution Platform
-- Idempotent: safe to run on a fresh or existing database
-- All migrations (013–022) are incorporated inline
-- ============================================================

-- ============================================================
-- SECTION 1: DATABASE
-- ============================================================
USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'RetailERP')
    CREATE DATABASE RetailERP;
GO

USE RetailERP;
GO

-- ============================================================
-- SECTION 2: SCHEMAS
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'auth')       EXEC('CREATE SCHEMA auth');
GO
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'master')     EXEC('CREATE SCHEMA master');
GO
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'product')    EXEC('CREATE SCHEMA product');
GO
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'inventory')  EXEC('CREATE SCHEMA inventory');
GO
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'production') EXEC('CREATE SCHEMA production');
GO
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'sales')      EXEC('CREATE SCHEMA sales');
GO
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'billing')    EXEC('CREATE SCHEMA billing');
GO
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'warehouse')  EXEC('CREATE SCHEMA warehouse');
GO
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'audit')      EXEC('CREATE SCHEMA audit');
GO

PRINT 'Schemas ready.';
GO

-- ============================================================
-- SECTION 3: AUTH TABLES
-- ============================================================
USE RetailERP;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Tenants' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.Tenants (
    TenantId        UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantName      NVARCHAR(200)       NOT NULL,
    TenantCode      NVARCHAR(50)        NOT NULL,
    CompanyName     NVARCHAR(300)       NOT NULL,
    GSTIN           NVARCHAR(15)        NULL,
    PAN             NVARCHAR(10)        NULL,
    Address         NVARCHAR(500)       NULL,
    City            NVARCHAR(100)       NULL,
    State           NVARCHAR(100)       NULL,
    PinCode         NVARCHAR(10)        NULL,
    Phone           NVARCHAR(20)        NULL,
    Email           NVARCHAR(200)       NULL,
    LogoUrl         NVARCHAR(500)       NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CONSTRAINT PK_Tenants PRIMARY KEY (TenantId),
    CONSTRAINT UQ_Tenants_Code UNIQUE (TenantCode)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Roles' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.Roles (
    RoleId          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    RoleName        NVARCHAR(100)       NOT NULL,
    Description     NVARCHAR(500)       NULL,
    IsSystem        BIT                 NOT NULL DEFAULT 0,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Roles PRIMARY KEY (RoleId),
    CONSTRAINT FK_Roles_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Roles_Name_Tenant UNIQUE (TenantId, RoleName)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Permissions' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.Permissions (
    PermissionId    UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    Module          NVARCHAR(100)       NOT NULL,
    CanView         BIT                 NOT NULL DEFAULT 0,
    CanAdd          BIT                 NOT NULL DEFAULT 0,
    CanEdit         BIT                 NOT NULL DEFAULT 0,
    CanDelete       BIT                 NOT NULL DEFAULT 0,
    CONSTRAINT PK_Permissions PRIMARY KEY (PermissionId),
    CONSTRAINT UQ_Permissions_Module UNIQUE (Module)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='RolePermissions' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.RolePermissions (
    RolePermissionId UNIQUEIDENTIFIER   NOT NULL DEFAULT NEWSEQUENTIALID(),
    RoleId          UNIQUEIDENTIFIER    NOT NULL,
    PermissionId    UNIQUEIDENTIFIER    NOT NULL,
    CanView         BIT                 NOT NULL DEFAULT 0,
    CanAdd          BIT                 NOT NULL DEFAULT 0,
    CanEdit         BIT                 NOT NULL DEFAULT 0,
    CanDelete       BIT                 NOT NULL DEFAULT 0,
    CONSTRAINT PK_RolePermissions PRIMARY KEY (RolePermissionId),
    CONSTRAINT FK_RolePerm_Role FOREIGN KEY (RoleId) REFERENCES auth.Roles(RoleId),
    CONSTRAINT FK_RolePerm_Perm FOREIGN KEY (PermissionId) REFERENCES auth.Permissions(PermissionId),
    CONSTRAINT UQ_RolePerm UNIQUE (RoleId, PermissionId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Users' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.Users (
    UserId          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    FullName        NVARCHAR(200)       NOT NULL,
    Email           NVARCHAR(200)       NOT NULL,
    PasswordHash    NVARCHAR(500)       NOT NULL,
    RoleId          UNIQUEIDENTIFIER    NOT NULL,
    AvatarUrl       NVARCHAR(500)       NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    IsFirstLogin    BIT                 NOT NULL DEFAULT 1,
    LastLoginAt     DATETIME2(7)        NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Users PRIMARY KEY (UserId),
    CONSTRAINT FK_Users_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Users_Role FOREIGN KEY (RoleId) REFERENCES auth.Roles(RoleId),
    CONSTRAINT UQ_Users_Email_Tenant UNIQUE (TenantId, Email)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='RefreshTokens' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.RefreshTokens (
    TokenId         UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    UserId          UNIQUEIDENTIFIER    NOT NULL,
    Token           NVARCHAR(500)       NOT NULL,
    ExpiresAt       DATETIME2(7)        NOT NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    RevokedAt       DATETIME2(7)        NULL,
    ReplacedByToken NVARCHAR(500)       NULL,
    CONSTRAINT PK_RefreshTokens PRIMARY KEY (TokenId),
    CONSTRAINT FK_RefreshTokens_User FOREIGN KEY (UserId) REFERENCES auth.Users(UserId)
);
GO

-- TenantSettings (includes CompanyName from migration 013)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='TenantSettings' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.TenantSettings (
    SettingsId          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId            UNIQUEIDENTIFIER    NOT NULL,
    CompanyName         NVARCHAR(200)       NULL,
    CompanyLogo         NVARCHAR(500)       NULL,
    TradeName           NVARCHAR(200)       NULL,
    Subtitle            NVARCHAR(200)       NULL,
    GSTIN               NVARCHAR(20)        NULL,
    PAN                 NVARCHAR(15)        NULL,
    CIN                 NVARCHAR(25)        NULL,
    AddressLine1        NVARCHAR(200)       NULL,
    AddressLine2        NVARCHAR(200)       NULL,
    AddressLine3        NVARCHAR(200)       NULL,
    City                NVARCHAR(100)       NULL,
    State               NVARCHAR(100)       NULL,
    Pincode             NVARCHAR(10)        NULL,
    Country             NVARCHAR(50)        NOT NULL DEFAULT 'India',
    Phone               NVARCHAR(20)        NULL,
    Email               NVARCHAR(200)       NULL,
    Website             NVARCHAR(200)       NULL,
    BankAccountName     NVARCHAR(200)       NULL,
    BankName            NVARCHAR(200)       NULL,
    BankBranch          NVARCHAR(200)       NULL,
    BankAccountNo       NVARCHAR(30)        NULL,
    BankIFSCode         NVARCHAR(15)        NULL,
    GSTRegType          NVARCHAR(20)        NOT NULL DEFAULT 'Regular' CHECK (GSTRegType IN ('Regular','Composition','Unregistered')),
    GSTRateFootwearLow  DECIMAL(5,2)        NOT NULL DEFAULT 5.00,
    GSTRateFootwearHigh DECIMAL(5,2)        NOT NULL DEFAULT 18.00,
    GSTRateOther        DECIMAL(5,2)        NOT NULL DEFAULT 18.00,
    HSNPrefix           NVARCHAR(10)        NULL,
    InvoicePrefix       NVARCHAR(20)        NULL,
    InvoiceFormat       NVARCHAR(100)       NULL,
    FYStartMonth        INT                 NOT NULL DEFAULT 4,
    TermsAndConditions  NVARCHAR(MAX)       NULL,
    Declaration         NVARCHAR(MAX)       NULL,
    AuthorisedSignatory NVARCHAR(200)       NULL,
    UpdatedAt           DATETIME2(7)        NULL,
    CONSTRAINT PK_TenantSettings PRIMARY KEY (SettingsId),
    CONSTRAINT FK_TenantSettings_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_TenantSettings_Tenant UNIQUE (TenantId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Licenses' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.Licenses (
    LicenseId       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    LicenseKey      NVARCHAR(30)        NOT NULL,
    PlanName        NVARCHAR(30)        NOT NULL DEFAULT 'Starter' CHECK (PlanName IN ('Starter','Professional','Enterprise','Trial')),
    Status          NVARCHAR(20)        NOT NULL DEFAULT 'Active' CHECK (Status IN ('Active','Expired','Revoked','Trial')),
    MaxUsers        INT                 NOT NULL DEFAULT 5,
    ValidFrom       DATE                NOT NULL DEFAULT GETDATE(),
    ValidUntil      DATE                NOT NULL,
    ModulesEnabled  NVARCHAR(MAX)       NULL,
    ActivatedBy     UNIQUEIDENTIFIER    NULL,
    ActivatedAt     DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Licenses PRIMARY KEY (LicenseId),
    CONSTRAINT FK_Licenses_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

-- ============================================================
-- SECTION 4: AUDIT TABLE
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='AuditLog' AND schema_id=SCHEMA_ID('audit'))
CREATE TABLE audit.AuditLog (
    AuditId         BIGINT IDENTITY(1,1) NOT NULL,
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    UserId          UNIQUEIDENTIFIER    NULL,
    Action          NVARCHAR(50)        NOT NULL,
    EntityType      NVARCHAR(100)       NOT NULL,
    EntityId        NVARCHAR(100)       NULL,
    OldValues       NVARCHAR(MAX)       NULL,
    NewValues       NVARCHAR(MAX)       NULL,
    IpAddress       NVARCHAR(50)        NULL,
    UserAgent       NVARCHAR(500)       NULL,
    Timestamp       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_AuditLog PRIMARY KEY CLUSTERED (AuditId)
);
GO

PRINT 'Auth + Audit tables ready.';
GO

-- ============================================================
-- SECTION 5: MASTER TABLES
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='States' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.States (
    StateId         INT                 NOT NULL,
    StateName       NVARCHAR(100)       NOT NULL,
    StateCode       NVARCHAR(5)         NOT NULL,
    Zone            NVARCHAR(20)        NOT NULL,
    CONSTRAINT PK_States PRIMARY KEY (StateId),
    CONSTRAINT UQ_States_Code UNIQUE (StateCode)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='HSNCodes' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.HSNCodes (
    HSNId           UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    HSNCode         NVARCHAR(20)        NOT NULL,
    Description     NVARCHAR(500)       NULL,
    GSTRate         DECIMAL(5,2)        NOT NULL DEFAULT 18.00,
    CONSTRAINT PK_HSNCodes PRIMARY KEY (HSNId),
    CONSTRAINT UQ_HSNCodes_Code UNIQUE (HSNCode)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Brands' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Brands (
    BrandId         UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    BrandName       NVARCHAR(200)       NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Brands PRIMARY KEY (BrandId),
    CONSTRAINT FK_Brands_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Genders' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Genders (
    GenderId        UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    GenderName      NVARCHAR(50)        NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Genders PRIMARY KEY (GenderId),
    CONSTRAINT FK_Genders_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Seasons' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Seasons (
    SeasonId        UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    SeasonCode      NVARCHAR(20)        NOT NULL,
    StartDate       DATE                NOT NULL,
    EndDate         DATE                NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Seasons PRIMARY KEY (SeasonId),
    CONSTRAINT FK_Seasons_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT CK_Seasons_Dates CHECK (EndDate > StartDate)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Segments' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Segments (
    SegmentId       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    SegmentName     NVARCHAR(200)       NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Segments PRIMARY KEY (SegmentId),
    CONSTRAINT FK_Segments_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='SubSegments' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.SubSegments (
    SubSegmentId    UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    SegmentId       UNIQUEIDENTIFIER    NOT NULL,
    SubSegmentName  NVARCHAR(200)       NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_SubSegments PRIMARY KEY (SubSegmentId),
    CONSTRAINT FK_SubSegments_Segment FOREIGN KEY (SegmentId) REFERENCES master.Segments(SegmentId),
    CONSTRAINT FK_SubSegments_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Categories' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Categories (
    CategoryId      UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    CategoryName    NVARCHAR(200)       NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Categories PRIMARY KEY (CategoryId),
    CONSTRAINT FK_Categories_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='SubCategories' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.SubCategories (
    SubCategoryId   UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    CategoryId      UNIQUEIDENTIFIER    NOT NULL,
    SubCategoryName NVARCHAR(200)       NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_SubCategories PRIMARY KEY (SubCategoryId),
    CONSTRAINT FK_SubCategories_Category FOREIGN KEY (CategoryId) REFERENCES master.Categories(CategoryId),
    CONSTRAINT FK_SubCategories_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Groups' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Groups (
    GroupId         UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    GroupName       NVARCHAR(200)       NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Groups PRIMARY KEY (GroupId),
    CONSTRAINT FK_Groups_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Colors' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Colors (
    ColorId         UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    ColorName       NVARCHAR(100)       NOT NULL,
    ColorCode       NVARCHAR(20)        NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Colors PRIMARY KEY (ColorId),
    CONSTRAINT FK_Colors_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Colors_Name_Tenant UNIQUE (TenantId, ColorName)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Styles' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Styles (
    StyleId         UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    StyleName       NVARCHAR(100)       NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Styles PRIMARY KEY (StyleId),
    CONSTRAINT FK_Styles_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Fasteners' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Fasteners (
    FastenerId      UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    FastenerName    NVARCHAR(100)       NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Fasteners PRIMARY KEY (FastenerId),
    CONSTRAINT FK_Fasteners_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='SizeCharts' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.SizeCharts (
    SizeChartId     UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    ChartType       NVARCHAR(50)        NOT NULL,
    GenderId        UNIQUEIDENTIFIER    NOT NULL,
    AgeGroup        NVARCHAR(50)        NOT NULL DEFAULT 'Adult',
    USSize          DECIMAL(5,1)        NULL,
    EuroSize        INT                 NULL,
    UKSize          DECIMAL(5,1)        NULL,
    IndSize         DECIMAL(5,1)        NULL,
    Inches          DECIMAL(8,4)        NULL,
    CM              DECIMAL(5,1)        NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CONSTRAINT PK_SizeCharts PRIMARY KEY (SizeChartId),
    CONSTRAINT FK_SizeCharts_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_SizeCharts_Gender FOREIGN KEY (GenderId) REFERENCES master.Genders(GenderId)
);
GO

PRINT 'Master tables ready.';
GO

-- ============================================================
-- SECTION 6: WAREHOUSE TABLE
-- (includes WarehouseType from migration 017)
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Warehouses' AND schema_id=SCHEMA_ID('warehouse'))
CREATE TABLE warehouse.Warehouses (
    WarehouseId     UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    WarehouseCode   NVARCHAR(50)        NOT NULL,
    WarehouseName   NVARCHAR(300)       NOT NULL,
    WarehouseType   NVARCHAR(20)        NOT NULL DEFAULT 'Main',
    Address         NVARCHAR(500)       NULL,
    City            NVARCHAR(100)       NULL,
    State           NVARCHAR(100)       NULL,
    PinCode         NVARCHAR(10)        NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Warehouses PRIMARY KEY (WarehouseId),
    CONSTRAINT FK_Warehouses_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

PRINT 'Warehouse table ready.';
GO

-- ============================================================
-- SECTION 7: PRODUCT TABLES
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Articles' AND schema_id=SCHEMA_ID('product'))
CREATE TABLE product.Articles (
    ArticleId       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    ArticleCode     NVARCHAR(50)        NOT NULL,
    ArticleName     NVARCHAR(300)       NOT NULL,
    BrandId         UNIQUEIDENTIFIER    NOT NULL,
    SegmentId       UNIQUEIDENTIFIER    NOT NULL,
    SubSegmentId    UNIQUEIDENTIFIER    NULL,
    CategoryId      UNIQUEIDENTIFIER    NOT NULL,
    SubCategoryId   UNIQUEIDENTIFIER    NULL,
    GroupId         UNIQUEIDENTIFIER    NULL,
    SeasonId        UNIQUEIDENTIFIER    NULL,
    GenderId        UNIQUEIDENTIFIER    NOT NULL,
    ColorId         UNIQUEIDENTIFIER    NULL,
    Color           NVARCHAR(100)       NOT NULL,
    Style           NVARCHAR(100)       NULL,
    Fastener        NVARCHAR(100)       NULL,
    HSNCode         NVARCHAR(20)        NOT NULL,
    UOM             NVARCHAR(20)        NOT NULL DEFAULT 'PAIRS',
    MRP             DECIMAL(12,2)       NOT NULL DEFAULT 0,
    CBD             DECIMAL(12,2)       NOT NULL DEFAULT 0,
    IsSizeBased     BIT                 NOT NULL DEFAULT 1,
    ImageUrl        NVARCHAR(500)       NULL,
    LaunchDate      DATE                NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Articles PRIMARY KEY (ArticleId),
    CONSTRAINT FK_Articles_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Articles_Brand FOREIGN KEY (BrandId) REFERENCES master.Brands(BrandId),
    CONSTRAINT FK_Articles_Segment FOREIGN KEY (SegmentId) REFERENCES master.Segments(SegmentId),
    CONSTRAINT FK_Articles_SubSegment FOREIGN KEY (SubSegmentId) REFERENCES master.SubSegments(SubSegmentId),
    CONSTRAINT FK_Articles_Category FOREIGN KEY (CategoryId) REFERENCES master.Categories(CategoryId),
    CONSTRAINT FK_Articles_SubCategory FOREIGN KEY (SubCategoryId) REFERENCES master.SubCategories(SubCategoryId),
    CONSTRAINT FK_Articles_Group FOREIGN KEY (GroupId) REFERENCES master.Groups(GroupId),
    CONSTRAINT FK_Articles_Season FOREIGN KEY (SeasonId) REFERENCES master.Seasons(SeasonId),
    CONSTRAINT FK_Articles_Gender FOREIGN KEY (GenderId) REFERENCES master.Genders(GenderId),
    CONSTRAINT UQ_Articles_Code_Tenant UNIQUE (TenantId, ArticleCode)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='FootwearDetails' AND schema_id=SCHEMA_ID('product'))
CREATE TABLE product.FootwearDetails (
    FootwearDetailId UNIQUEIDENTIFIER   NOT NULL DEFAULT NEWSEQUENTIALID(),
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    Last            NVARCHAR(100)       NULL,
    UpperLeather    NVARCHAR(200)       NULL,
    LiningLeather   NVARCHAR(200)       NULL,
    Sole            NVARCHAR(200)       NULL,
    SizeRunFrom     INT                 NULL,
    SizeRunTo       INT                 NULL,
    CONSTRAINT PK_FootwearDetails PRIMARY KEY (FootwearDetailId),
    CONSTRAINT FK_FootwearDetails_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT UQ_FootwearDetails_Article UNIQUE (ArticleId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='LeatherGoodsDetails' AND schema_id=SCHEMA_ID('product'))
CREATE TABLE product.LeatherGoodsDetails (
    LeatherGoodsDetailId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    Dimensions      NVARCHAR(100)       NULL,
    Security        NVARCHAR(100)       NULL,
    CONSTRAINT PK_LeatherGoodsDetails PRIMARY KEY (LeatherGoodsDetailId),
    CONSTRAINT FK_LeatherGoods_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT UQ_LeatherGoods_Article UNIQUE (ArticleId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='ArticleSizes' AND schema_id=SCHEMA_ID('product'))
CREATE TABLE product.ArticleSizes (
    ArticleSizeId   UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NOT NULL,
    UKSize          DECIMAL(5,1)        NULL,
    USSize          DECIMAL(5,1)        NULL,
    EANCode         NVARCHAR(20)        NULL,
    MRP             DECIMAL(12,2)       NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CONSTRAINT PK_ArticleSizes PRIMARY KEY (ArticleSizeId),
    CONSTRAINT FK_ArticleSizes_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT UQ_ArticleSizes_Article_Size UNIQUE (ArticleId, EuroSize)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='ArticleImages' AND schema_id=SCHEMA_ID('product'))
CREATE TABLE product.ArticleImages (
    ImageId         UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    ImageUrl        NVARCHAR(500)       NOT NULL,
    DisplayOrder    INT                 NOT NULL DEFAULT 0,
    IsPrimary       BIT                 NOT NULL DEFAULT 0,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ArticleImages PRIMARY KEY (ImageId),
    CONSTRAINT FK_ArticleImages_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

PRINT 'Product tables ready.';
GO

-- ============================================================
-- SECTION 8: INVENTORY TABLES
-- (includes all columns from migrations 019)
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockLedger' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockLedger (
    StockLedgerId   UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    WarehouseId     UNIQUEIDENTIFIER    NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NULL,
    OpeningStock    INT                 NOT NULL DEFAULT 0,
    InwardQty       INT                 NOT NULL DEFAULT 0,
    OutwardQty      INT                 NOT NULL DEFAULT 0,
    ClosingStock    AS (OpeningStock + InwardQty - OutwardQty) PERSISTED,
    LastUpdated     DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_StockLedger PRIMARY KEY (StockLedgerId),
    CONSTRAINT FK_StockLedger_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_StockLedger_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT FK_StockLedger_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT UQ_StockLedger UNIQUE (TenantId, WarehouseId, ArticleId, EuroSize),
    CONSTRAINT CK_StockLedger_Positive CHECK (OpeningStock + InwardQty - OutwardQty >= 0)
);
GO

-- StockMovements: includes DISPATCH in movement type check (migration 019)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockMovements' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockMovements (
    MovementId      UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    WarehouseId     UNIQUEIDENTIFIER    NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NULL,
    MovementType    NVARCHAR(30)        NOT NULL,
    Direction       NVARCHAR(10)        NOT NULL,
    Quantity        INT                 NOT NULL,
    ReferenceType   NVARCHAR(50)        NULL,
    ReferenceId     UNIQUEIDENTIFIER    NULL,
    Notes           NVARCHAR(500)       NULL,
    MovementDate    DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_StockMovements PRIMARY KEY (MovementId),
    CONSTRAINT FK_StockMovements_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_StockMovements_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT FK_StockMovements_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT CK_StockMovements_Qty CHECK (Quantity > 0),
    CONSTRAINT CK_StockMovements_Dir CHECK (Direction IN ('INWARD', 'OUTWARD')),
    CONSTRAINT CK_StockMovements_Type CHECK (MovementType IN ('OPENING','PURCHASE','PRODUCTION','SALES','RETURN','ADJUSTMENT','DISPATCH'))
);
GO

-- StockAdjustments: includes all extra columns from migration 019
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockAdjustments' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockAdjustments (
    AdjustmentId        UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId            UNIQUEIDENTIFIER    NOT NULL,
    WarehouseId         UNIQUEIDENTIFIER    NOT NULL,
    AdjustmentNo        NVARCHAR(50)        NOT NULL,
    AdjustmentNumber    NVARCHAR(50)        NULL,
    AdjustmentDate      DATE                NOT NULL,
    AdjustmentType      NVARCHAR(10)        NULL,
    Reason              NVARCHAR(500)       NULL,
    Notes               NVARCHAR(500)       NULL,
    TotalQuantity       INT                 NOT NULL DEFAULT 0,
    Status              NVARCHAR(20)        NOT NULL DEFAULT 'DRAFT',
    ApprovedBy          UNIQUEIDENTIFIER    NULL,
    ApprovedAt          DATETIME2(7)        NULL,
    RejectedBy          UNIQUEIDENTIFIER    NULL,
    RejectedAt          DATETIME2(7)        NULL,
    RejectionReason     NVARCHAR(500)       NULL,
    AppliedAt           DATETIME2(7)        NULL,
    CreatedAt           DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2(7)        NULL,
    CreatedBy           UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_StockAdjustments PRIMARY KEY (AdjustmentId),
    CONSTRAINT FK_StockAdj_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_StockAdj_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId)
);
GO

-- StockAdjustmentLines: AdjustmentType is nullable (migration 019)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockAdjustmentLines' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockAdjustmentLines (
    AdjustmentLineId UNIQUEIDENTIFIER   NOT NULL DEFAULT NEWSEQUENTIALID(),
    AdjustmentId    UNIQUEIDENTIFIER    NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NULL,
    AdjustmentType  NVARCHAR(10)        NULL,
    Quantity        INT                 NOT NULL,
    CONSTRAINT PK_StockAdjustmentLines PRIMARY KEY (AdjustmentLineId),
    CONSTRAINT FK_SAL_Adjustment FOREIGN KEY (AdjustmentId) REFERENCES inventory.StockAdjustments(AdjustmentId),
    CONSTRAINT FK_SAL_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='GoodsReceivedNotes' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.GoodsReceivedNotes (
    GRNId           UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    GRNNumber       NVARCHAR(50)        NOT NULL,
    WarehouseId     UNIQUEIDENTIFIER    NOT NULL,
    ReceiptDate     DATE                NOT NULL DEFAULT GETDATE(),
    SourceType      NVARCHAR(20)        NOT NULL DEFAULT 'Purchase' CHECK (SourceType IN ('Purchase','Production','Return','Transfer')),
    ReferenceNo     NVARCHAR(100)       NULL,
    Status          NVARCHAR(20)        NOT NULL DEFAULT 'Draft' CHECK (Status IN ('Draft','Confirmed','Cancelled')),
    Notes           NVARCHAR(500)       NULL,
    TotalQuantity   INT                 NOT NULL DEFAULT 0,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_GRN PRIMARY KEY (GRNId),
    CONSTRAINT FK_GRN_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_GRN_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT UQ_GRN_Number_Tenant UNIQUE (TenantId, GRNNumber)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='GRNLines' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.GRNLines (
    GRNLineId       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    GRNId           UNIQUEIDENTIFIER    NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NULL,
    Quantity        INT                 NOT NULL DEFAULT 0,
    CONSTRAINT PK_GRNLines PRIMARY KEY (GRNLineId),
    CONSTRAINT FK_GRNLines_GRN FOREIGN KEY (GRNId) REFERENCES inventory.GoodsReceivedNotes(GRNId),
    CONSTRAINT FK_GRNLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockFreezes' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockFreezes (
    FreezeId        UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    WarehouseId     UNIQUEIDENTIFIER    NOT NULL,
    FreezeMonth     INT                 NOT NULL CHECK (FreezeMonth BETWEEN 1 AND 12),
    FreezeYear      INT                 NOT NULL CHECK (FreezeYear BETWEEN 2020 AND 2100),
    Status          NVARCHAR(20)        NOT NULL DEFAULT 'Open' CHECK (Status IN ('Open','Frozen')),
    FrozenAt        DATETIME2(7)        NULL,
    FrozenBy        UNIQUEIDENTIFIER    NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_StockFreeze PRIMARY KEY (FreezeId),
    CONSTRAINT FK_StockFreeze_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_StockFreeze_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT UQ_StockFreeze UNIQUE (TenantId, WarehouseId, FreezeMonth, FreezeYear)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockFreezeLines' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockFreezeLines (
    FreezeLineId        UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    FreezeId            UNIQUEIDENTIFIER    NOT NULL,
    ArticleId           UNIQUEIDENTIFIER    NOT NULL,
    EuroSize            INT                 NULL,
    OpeningQty          INT                 NOT NULL DEFAULT 0,
    OpeningValue        DECIMAL(18,2)       NOT NULL DEFAULT 0,
    ReceivedQty         INT                 NOT NULL DEFAULT 0,
    ReceivedValue       DECIMAL(18,2)       NOT NULL DEFAULT 0,
    IssuedQty           INT                 NOT NULL DEFAULT 0,
    IssuedValue         DECIMAL(18,2)       NOT NULL DEFAULT 0,
    ReturnQty           INT                 NOT NULL DEFAULT 0,
    ReturnValue         DECIMAL(18,2)       NOT NULL DEFAULT 0,
    HandloanInQty       INT                 NOT NULL DEFAULT 0,
    HandloanInValue     DECIMAL(18,2)       NOT NULL DEFAULT 0,
    HandloanOutQty      INT                 NOT NULL DEFAULT 0,
    HandloanOutValue    DECIMAL(18,2)       NOT NULL DEFAULT 0,
    JobworkInQty        INT                 NOT NULL DEFAULT 0,
    JobworkInValue      DECIMAL(18,2)       NOT NULL DEFAULT 0,
    JobworkOutQty       INT                 NOT NULL DEFAULT 0,
    JobworkOutValue     DECIMAL(18,2)       NOT NULL DEFAULT 0,
    ClosingQty          INT                 NOT NULL DEFAULT 0,
    ClosingValue        DECIMAL(18,2)       NOT NULL DEFAULT 0,
    CONSTRAINT PK_StockFreezeLines PRIMARY KEY (FreezeLineId),
    CONSTRAINT FK_StockFreezeLines_Freeze FOREIGN KEY (FreezeId) REFERENCES inventory.StockFreezes(FreezeId),
    CONSTRAINT FK_StockFreezeLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Dispatches' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.Dispatches (
    DispatchId          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId            UNIQUEIDENTIFIER    NOT NULL,
    DispatchNumber      NVARCHAR(50)        NOT NULL,
    WarehouseId         UNIQUEIDENTIFIER    NOT NULL,
    ClientId            UNIQUEIDENTIFIER    NULL,
    StoreId             UNIQUEIDENTIFIER    NULL,
    DispatchDate        DATE                NOT NULL DEFAULT GETDATE(),
    ReferenceOrderNo    NVARCHAR(100)       NULL,
    TransportMode       NVARCHAR(50)        NULL,
    VehicleNo           NVARCHAR(50)        NULL,
    LogisticsPartner    NVARCHAR(100)       NULL,
    Status              NVARCHAR(20)        NOT NULL DEFAULT 'Dispatched',
    TotalQuantity       INT                 NOT NULL DEFAULT 0,
    Notes               NVARCHAR(500)       NULL,
    CreatedAt           DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2(7)        NULL,
    CreatedBy           UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Dispatches PRIMARY KEY (DispatchId),
    CONSTRAINT FK_Dispatches_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Dispatches_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='DispatchLines' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.DispatchLines (
    DispatchLineId  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    DispatchId      UNIQUEIDENTIFIER    NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NULL,
    Quantity        INT                 NOT NULL DEFAULT 0,
    CONSTRAINT PK_DispatchLines PRIMARY KEY (DispatchLineId),
    CONSTRAINT FK_DispatchLines_Dispatch FOREIGN KEY (DispatchId) REFERENCES inventory.Dispatches(DispatchId),
    CONSTRAINT FK_DispatchLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockReturns' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockReturns (
    ReturnId        UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    ReturnNumber    NVARCHAR(50)        NOT NULL,
    WarehouseId     UNIQUEIDENTIFIER    NOT NULL,
    ClientId        UNIQUEIDENTIFIER    NULL,
    StoreId         UNIQUEIDENTIFIER    NULL,
    ReturnDate      DATE                NOT NULL DEFAULT GETDATE(),
    Reason          NVARCHAR(500)       NOT NULL,
    Status          NVARCHAR(20)        NOT NULL DEFAULT 'Received',
    TotalQuantity   INT                 NOT NULL DEFAULT 0,
    Notes           NVARCHAR(500)       NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_StockReturns PRIMARY KEY (ReturnId),
    CONSTRAINT FK_StockReturns_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_StockReturns_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='ReturnLines' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.ReturnLines (
    ReturnLineId    UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    ReturnId        UNIQUEIDENTIFIER    NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NULL,
    Quantity        INT                 NOT NULL DEFAULT 0,
    CONSTRAINT PK_ReturnLines PRIMARY KEY (ReturnLineId),
    CONSTRAINT FK_ReturnLines_Return FOREIGN KEY (ReturnId) REFERENCES inventory.StockReturns(ReturnId),
    CONSTRAINT FK_ReturnLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

PRINT 'Inventory tables ready.';
GO

-- ============================================================
-- SECTION 9: PRODUCTION TABLES
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='ProductionOrders' AND schema_id=SCHEMA_ID('production'))
CREATE TABLE production.ProductionOrders (
    ProductionOrderId UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    OrderNo         NVARCHAR(50)        NOT NULL,
    OrderDate       DATE                NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    GroupId         UNIQUEIDENTIFIER    NULL,
    Color           NVARCHAR(100)       NOT NULL,
    Last            NVARCHAR(100)       NULL,
    UpperLeather    NVARCHAR(200)       NULL,
    LiningLeather   NVARCHAR(200)       NULL,
    Sole            NVARCHAR(200)       NULL,
    OrderType       NVARCHAR(50)        NOT NULL DEFAULT 'REPLENISHMENT',
    TotalQuantity   INT                 NOT NULL DEFAULT 0,
    Status          NVARCHAR(30)        NOT NULL DEFAULT 'DRAFT',
    UpperCuttingDies        NVARCHAR(100) NULL,
    MaterialCuttingDies     NVARCHAR(100) NULL,
    SocksInsoleCuttingDies  NVARCHAR(100) NULL,
    Notes           NVARCHAR(1000)      NULL,
    ApprovedBy      UNIQUEIDENTIFIER    NULL,
    ApprovedAt      DATETIME2(7)        NULL,
    CompletedAt     DATETIME2(7)        NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_ProductionOrders PRIMARY KEY (ProductionOrderId),
    CONSTRAINT FK_ProdOrders_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_ProdOrders_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT UQ_ProdOrders_No_Tenant UNIQUE (TenantId, OrderNo),
    CONSTRAINT CK_ProdOrders_Status CHECK (Status IN ('DRAFT','APPROVED','IN_PRODUCTION','COMPLETED','CANCELLED'))
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='ProductionSizeRuns' AND schema_id=SCHEMA_ID('production'))
CREATE TABLE production.ProductionSizeRuns (
    SizeRunId           UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    ProductionOrderId   UNIQUEIDENTIFIER    NOT NULL,
    EuroSize            INT                 NOT NULL,
    Quantity            INT                 NOT NULL DEFAULT 0,
    ProducedQty         INT                 NOT NULL DEFAULT 0,
    CONSTRAINT PK_ProductionSizeRuns PRIMARY KEY (SizeRunId),
    CONSTRAINT FK_ProdSizeRun_Order FOREIGN KEY (ProductionOrderId) REFERENCES production.ProductionOrders(ProductionOrderId),
    CONSTRAINT UQ_ProdSizeRun UNIQUE (ProductionOrderId, EuroSize),
    CONSTRAINT CK_ProdSizeRun_Qty CHECK (Quantity >= 0),
    CONSTRAINT CK_ProdSizeRun_Produced CHECK (ProducedQty >= 0 AND ProducedQty <= Quantity)
);
GO

PRINT 'Production tables ready.';
GO

-- ============================================================
-- SECTION 10: SALES / CUSTOMER TABLES
-- (includes migrations 020, 021, 022 inline)
-- ============================================================

-- sales.Clients: includes State column (migration 022)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Clients' AND schema_id=SCHEMA_ID('sales'))
CREATE TABLE sales.Clients (
    ClientId        UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    ClientCode      NVARCHAR(50)        NOT NULL,
    ClientName      NVARCHAR(300)       NOT NULL,
    Organisation    NVARCHAR(300)       NULL,
    GSTIN           NVARCHAR(15)        NULL,
    PAN             NVARCHAR(10)        NULL,
    StateId         INT                 NULL,
    StateCode       NVARCHAR(5)         NULL,
    State           NVARCHAR(100)       NULL,
    Zone            NVARCHAR(20)        NULL,
    Email           NVARCHAR(200)       NULL,
    ContactNo       NVARCHAR(20)        NULL,
    MarginPercent   DECIMAL(5,2)        NOT NULL DEFAULT 0,
    MarginType      NVARCHAR(20)        NOT NULL DEFAULT 'NET OF TAXES',
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Clients PRIMARY KEY (ClientId),
    CONSTRAINT FK_Clients_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Clients_State FOREIGN KEY (StateId) REFERENCES master.States(StateId)
);
GO

-- sales.Stores: includes Zone, StateCode, ContactNo, Pincode (migration 021)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Stores' AND schema_id=SCHEMA_ID('sales'))
CREATE TABLE sales.Stores (
    StoreId         UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    ClientId        UNIQUEIDENTIFIER    NOT NULL,
    StoreCode       NVARCHAR(50)        NOT NULL,
    StoreName       NVARCHAR(300)       NOT NULL,
    Format          NVARCHAR(50)        NULL,
    Organisation    NVARCHAR(300)       NULL,
    City            NVARCHAR(100)       NULL,
    State           NVARCHAR(100)       NULL,
    Zone            NVARCHAR(20)        NULL,
    StateCode       NVARCHAR(5)         NULL,
    ContactNo       NVARCHAR(20)        NULL,
    Pincode         NVARCHAR(10)        NULL,
    Channel         NVARCHAR(50)        NULL,
    ModusOperandi   NVARCHAR(10)        NULL,
    MarginPercent   DECIMAL(5,2)        NOT NULL DEFAULT 0,
    MarginType      NVARCHAR(20)        NOT NULL DEFAULT 'NET OF TAXES',
    ManagerName     NVARCHAR(200)       NULL,
    Email           NVARCHAR(200)       NULL,
    GSTIN           NVARCHAR(15)        NULL,
    PAN             NVARCHAR(10)        NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Stores PRIMARY KEY (StoreId),
    CONSTRAINT FK_Stores_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Stores_Client FOREIGN KEY (ClientId) REFERENCES sales.Clients(ClientId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CustomerMasterEntries' AND schema_id=SCHEMA_ID('sales'))
CREATE TABLE sales.CustomerMasterEntries (
    CustomerEntryId UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    StoreId         UNIQUEIDENTIFIER    NOT NULL,
    ClientId        UNIQUEIDENTIFIER    NOT NULL,
    EntryDate       DATE                NOT NULL,
    StoreCode       NVARCHAR(50)        NULL,
    Organisation    NVARCHAR(300)       NULL,
    BillingAddress1 NVARCHAR(200)       NULL,
    BillingAddress2 NVARCHAR(200)       NULL,
    BillingAddress3 NVARCHAR(200)       NULL,
    BillingAddress4 NVARCHAR(200)       NULL,
    BillingAddress5 NVARCHAR(200)       NULL,
    BillingPinCode  NVARCHAR(10)        NULL,
    BillingCity     NVARCHAR(100)       NULL,
    BillingNumber   NVARCHAR(20)        NULL,
    BillingState    NVARCHAR(100)       NULL,
    BillingStateCode NVARCHAR(5)        NULL,
    BillingZone     NVARCHAR(20)        NULL,
    SameAsBilling   BIT                 NOT NULL DEFAULT 0,
    ShippingAddress1 NVARCHAR(200)      NULL,
    ShippingAddress2 NVARCHAR(200)      NULL,
    ShippingAddress3 NVARCHAR(200)      NULL,
    ShippingPinCode NVARCHAR(10)        NULL,
    ShippingCity    NVARCHAR(100)       NULL,
    ShippingNumber  NVARCHAR(20)        NULL,
    ShippingState   NVARCHAR(100)       NULL,
    ShippingStateCode NVARCHAR(5)       NULL,
    ShippingZone    NVARCHAR(20)        NULL,
    ContactName     NVARCHAR(200)       NULL,
    ContactNo       NVARCHAR(20)        NULL,
    Email           NVARCHAR(200)       NULL,
    StoreManager    NVARCHAR(200)       NULL,
    ManagerContact  NVARCHAR(20)        NULL,
    AreaManager     NVARCHAR(200)       NULL,
    AreaContact     NVARCHAR(20)        NULL,
    BuyerDesign     NVARCHAR(200)       NULL,
    GSTIN           NVARCHAR(15)        NULL,
    GSTStateCode    NVARCHAR(5)         NULL,
    PAN             NVARCHAR(10)        NULL,
    FSSAI           NVARCHAR(20)        NULL,
    BusinessChannel NVARCHAR(50)        NULL,
    BusinessModule  NVARCHAR(50)        NULL,
    MarginPercent   DECIMAL(5,2)        NOT NULL DEFAULT 0,
    MarginType      NVARCHAR(20)        NOT NULL DEFAULT 'NET OF TAXES',
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CONSTRAINT PK_CustomerMasterEntries PRIMARY KEY (CustomerEntryId),
    CONSTRAINT FK_CME_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_CME_Store FOREIGN KEY (StoreId) REFERENCES sales.Stores(StoreId),
    CONSTRAINT FK_CME_Client FOREIGN KEY (ClientId) REFERENCES sales.Clients(ClientId)
);
GO

-- sales.CustomerOrders: includes Channel, CancelledBy, CancelledAt, CancellationReason (migration 020)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CustomerOrders' AND schema_id=SCHEMA_ID('sales'))
CREATE TABLE sales.CustomerOrders (
    OrderId             UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId            UNIQUEIDENTIFIER    NOT NULL,
    OrderNo             NVARCHAR(50)        NOT NULL,
    OrderDate           DATE                NOT NULL,
    ClientId            UNIQUEIDENTIFIER    NOT NULL,
    StoreId             UNIQUEIDENTIFIER    NOT NULL,
    WarehouseId         UNIQUEIDENTIFIER    NULL,
    Channel             NVARCHAR(50)        NULL,
    TotalQuantity       INT                 NOT NULL DEFAULT 0,
    TotalMRP            DECIMAL(14,2)       NOT NULL DEFAULT 0,
    TotalAmount         DECIMAL(14,2)       NOT NULL DEFAULT 0,
    Status              NVARCHAR(30)        NOT NULL DEFAULT 'DRAFT',
    Notes               NVARCHAR(1000)      NULL,
    ConfirmedBy         UNIQUEIDENTIFIER    NULL,
    ConfirmedAt         DATETIME2(7)        NULL,
    CancelledBy         UNIQUEIDENTIFIER    NULL,
    CancelledAt         DATETIME2(7)        NULL,
    CancellationReason  NVARCHAR(500)       NULL,
    CreatedAt           DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2(7)        NULL,
    CreatedBy           UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_CustomerOrders PRIMARY KEY (OrderId),
    CONSTRAINT FK_CustOrders_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_CustOrders_Client FOREIGN KEY (ClientId) REFERENCES sales.Clients(ClientId),
    CONSTRAINT FK_CustOrders_Store FOREIGN KEY (StoreId) REFERENCES sales.Stores(StoreId),
    CONSTRAINT FK_CustOrders_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT UQ_CustOrders_No_Tenant UNIQUE (TenantId, OrderNo)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='OrderLines' AND schema_id=SCHEMA_ID('sales'))
CREATE TABLE sales.OrderLines (
    OrderLineId     UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    OrderId         UNIQUEIDENTIFIER    NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    Color           NVARCHAR(100)       NULL,
    EuroSize        INT                 NULL,
    HSNCode         NVARCHAR(20)        NOT NULL,
    MRP             DECIMAL(12,2)       NOT NULL,
    Quantity        INT                 NOT NULL,
    DispatchedQty   INT                 NOT NULL DEFAULT 0,
    LineTotal       DECIMAL(14,2)       NOT NULL,
    StockAvailable  BIT                 NOT NULL DEFAULT 0,
    CONSTRAINT PK_OrderLines PRIMARY KEY (OrderLineId),
    CONSTRAINT FK_OrderLines_Order FOREIGN KEY (OrderId) REFERENCES sales.CustomerOrders(OrderId),
    CONSTRAINT FK_OrderLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT CK_OrderLines_Qty CHECK (Quantity > 0)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='OrderSizeRuns' AND schema_id=SCHEMA_ID('sales'))
CREATE TABLE sales.OrderSizeRuns (
    OrderSizeRunId  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    OrderLineId     UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NOT NULL,
    Quantity        INT                 NOT NULL DEFAULT 0,
    StockAvailable  INT                 NOT NULL DEFAULT 0,
    CONSTRAINT PK_OrderSizeRuns PRIMARY KEY (OrderSizeRunId),
    CONSTRAINT FK_OrderSizeRuns_OrderLine FOREIGN KEY (OrderLineId) REFERENCES sales.OrderLines(OrderLineId)
);
GO

PRINT 'Sales tables ready.';
GO

-- ============================================================
-- SECTION 11: BILLING TABLES
-- (all extra columns from migration 014 incorporated inline)
-- ============================================================

-- billing.Invoices: full column set
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Invoices' AND schema_id=SCHEMA_ID('billing'))
CREATE TABLE billing.Invoices (
    InvoiceId               UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId                UNIQUEIDENTIFIER    NOT NULL,
    InvoiceNo               NVARCHAR(50)        NOT NULL,
    InvoiceDate             DATE                NOT NULL,
    InvoiceType             NVARCHAR(30)        NOT NULL DEFAULT 'TAX_INVOICE',
    OrderId                 UNIQUEIDENTIFIER    NULL,
    OrderNumber             NVARCHAR(100)       NULL,
    ClientId                UNIQUEIDENTIFIER    NOT NULL,
    StoreId                 UNIQUEIDENTIFIER    NOT NULL,
    StoreName               NVARCHAR(250)       NULL,
    -- Billing Address
    BillToName              NVARCHAR(300)       NULL,
    BillToAddress           NVARCHAR(500)       NULL,
    BillToGSTIN             NVARCHAR(15)        NULL,
    BillToState             NVARCHAR(100)       NULL,
    BillToStateCode         NVARCHAR(5)         NULL,
    ClientAddress           NVARCHAR(1000)      NULL,
    -- Shipping Address
    ShipToName              NVARCHAR(300)       NULL,
    ShipToAddress           NVARCHAR(500)       NULL,
    ShipToGSTIN             NVARCHAR(15)        NULL,
    ShipToState             NVARCHAR(100)       NULL,
    ShipToStateCode         NVARCHAR(5)         NULL,
    -- GST
    PlaceOfSupply           NVARCHAR(100)       NULL,
    PlaceOfSupplyCode       NVARCHAR(5)         NULL,
    IsInterState            BIT                 NOT NULL DEFAULT 0,
    SalesType               NVARCHAR(20)        NOT NULL DEFAULT 'Local',
    SellerState             NVARCHAR(100)       NULL,
    BuyerState              NVARCHAR(100)       NULL,
    -- PO Details
    PONumber                NVARCHAR(100)       NULL,
    PODate                  DATE                NULL,
    DueDate                 DATE                NULL,
    -- Totals
    SubTotal                DECIMAL(14,2)       NOT NULL DEFAULT 0,
    TotalDiscount           DECIMAL(14,2)       NOT NULL DEFAULT 0,
    DiscountAmount          DECIMAL(18,2)       NOT NULL DEFAULT 0,
    TaxableAmount           DECIMAL(14,2)       NOT NULL DEFAULT 0,
    CGSTAmount              DECIMAL(14,2)       NOT NULL DEFAULT 0,
    SGSTAmount              DECIMAL(14,2)       NOT NULL DEFAULT 0,
    IGSTAmount              DECIMAL(14,2)       NOT NULL DEFAULT 0,
    TotalGST                DECIMAL(14,2)       NOT NULL DEFAULT 0,
    CGSTTotal               DECIMAL(18,2)       NOT NULL DEFAULT 0,
    SGSTTotal               DECIMAL(18,2)       NOT NULL DEFAULT 0,
    IGSTTotal               DECIMAL(18,2)       NOT NULL DEFAULT 0,
    TotalTax                DECIMAL(18,2)       NOT NULL DEFAULT 0,
    GrandTotal              DECIMAL(14,2)       NOT NULL DEFAULT 0,
    RoundOff                DECIMAL(8,2)        NOT NULL DEFAULT 0,
    NetPayable              DECIMAL(14,2)       NOT NULL DEFAULT 0,
    TotalAmount             DECIMAL(18,2)       NOT NULL DEFAULT 0,
    PaidAmount              DECIMAL(18,2)       NOT NULL DEFAULT 0,
    TotalMarginAmount       DECIMAL(18,2)       NOT NULL DEFAULT 0,
    TotalGSTPayableValue    DECIMAL(18,2)       NOT NULL DEFAULT 0,
    TotalBillingExclGST     DECIMAL(18,2)       NOT NULL DEFAULT 0,
    TotalGSTReimbursementValue DECIMAL(18,2)    NOT NULL DEFAULT 0,
    TotalBillingInclGST     DECIMAL(18,2)       NOT NULL DEFAULT 0,
    TotalQuantity           INT                 NOT NULL DEFAULT 0,
    -- Logistics
    CartonBoxes             INT                 NOT NULL DEFAULT 0,
    Logistic                NVARCHAR(250)       NULL,
    TransportMode           NVARCHAR(100)       NULL,
    VehicleNo               NVARCHAR(50)        NULL,
    -- Company snapshot
    CompanyName             NVARCHAR(500)       NULL,
    CompanyAddress          NVARCHAR(1000)      NULL,
    CompanyGSTIN            NVARCHAR(20)        NULL,
    CompanyPAN              NVARCHAR(20)        NULL,
    BankName                NVARCHAR(250)       NULL,
    BankAccountNo           NVARCHAR(50)        NULL,
    BankIFSC                NVARCHAR(20)        NULL,
    BankBranch              NVARCHAR(250)       NULL,
    -- Status
    Status                  NVARCHAR(20)        NOT NULL DEFAULT 'Draft',
    IsActive                BIT                 NOT NULL DEFAULT 1,
    IRN                     NVARCHAR(100)       NULL,
    EWayBillNo              NVARCHAR(50)        NULL,
    Notes                   NVARCHAR(2000)      NULL,
    CreatedAt               DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt               DATETIME2(7)        NULL,
    CreatedBy               UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Invoices PRIMARY KEY (InvoiceId),
    CONSTRAINT FK_Invoices_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Invoices_Order FOREIGN KEY (OrderId) REFERENCES sales.CustomerOrders(OrderId),
    CONSTRAINT FK_Invoices_Client FOREIGN KEY (ClientId) REFERENCES sales.Clients(ClientId),
    CONSTRAINT FK_Invoices_Store FOREIGN KEY (StoreId) REFERENCES sales.Stores(StoreId),
    CONSTRAINT UQ_Invoices_No_Tenant UNIQUE (TenantId, InvoiceNo)
);
GO

-- billing.InvoiceLines: full column set
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='InvoiceLines' AND schema_id=SCHEMA_ID('billing'))
CREATE TABLE billing.InvoiceLines (
    InvoiceLineId           UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    InvoiceId               UNIQUEIDENTIFIER    NOT NULL,
    LineNumber              INT                 NOT NULL DEFAULT 1,
    ArticleId               UNIQUEIDENTIFIER    NOT NULL,
    ArticleCode             NVARCHAR(50)        NOT NULL,
    ArticleName             NVARCHAR(300)       NOT NULL,
    SKU                     NVARCHAR(100)       NULL,
    Description             NVARCHAR(1000)      NULL,
    HSNCode                 NVARCHAR(20)        NOT NULL,
    Color                   NVARCHAR(100)       NULL,
    EuroSize                INT                 NULL,
    Size                    NVARCHAR(50)        NULL,
    SizeBreakdownJson       NVARCHAR(2000)      NULL,
    EANCode                 NVARCHAR(20)        NULL,
    UOM                     NVARCHAR(20)        NOT NULL DEFAULT 'PAIRS',
    Quantity                INT                 NOT NULL,
    MRP                     DECIMAL(12,2)       NOT NULL,
    MarginPercent           DECIMAL(5,2)        NOT NULL DEFAULT 0,
    MarginAmount            DECIMAL(12,2)       NOT NULL DEFAULT 0,
    UnitPrice               DECIMAL(12,2)       NOT NULL DEFAULT 0,
    TaxableAmount           DECIMAL(14,2)       NOT NULL DEFAULT 0,
    GSTRate                 DECIMAL(5,2)        NOT NULL DEFAULT 18.00,
    CGSTRate                DECIMAL(5,2)        NOT NULL DEFAULT 0,
    CGSTAmount              DECIMAL(12,2)       NOT NULL DEFAULT 0,
    SGSTRate                DECIMAL(5,2)        NOT NULL DEFAULT 0,
    SGSTAmount              DECIMAL(12,2)       NOT NULL DEFAULT 0,
    IGSTRate                DECIMAL(5,2)        NOT NULL DEFAULT 0,
    IGSTAmount              DECIMAL(12,2)       NOT NULL DEFAULT 0,
    GSTPayablePercent       DECIMAL(5,2)        NOT NULL DEFAULT 0,
    GSTPayableValue         DECIMAL(18,2)       NOT NULL DEFAULT 0,
    GSTReimbursementPercent DECIMAL(5,2)        NOT NULL DEFAULT 0,
    GSTReimbursementValue   DECIMAL(18,2)       NOT NULL DEFAULT 0,
    TotalBilling            DECIMAL(18,2)       NOT NULL DEFAULT 0,
    TotalAmount             DECIMAL(14,2)       NOT NULL DEFAULT 0,
    LineTotal               DECIMAL(18,2)       NOT NULL DEFAULT 0,
    CONSTRAINT PK_InvoiceLines PRIMARY KEY (InvoiceLineId),
    CONSTRAINT FK_InvLines_Invoice FOREIGN KEY (InvoiceId) REFERENCES billing.Invoices(InvoiceId),
    CONSTRAINT FK_InvLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

-- billing.PackingLists: full column set
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='PackingLists' AND schema_id=SCHEMA_ID('billing'))
CREATE TABLE billing.PackingLists (
    PackingListId   UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    InvoiceId       UNIQUEIDENTIFIER    NOT NULL,
    WarehouseId     UNIQUEIDENTIFIER    NULL,
    PackingNo       NVARCHAR(50)        NOT NULL,
    PackingDate     DATE                NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    TotalCartons    INT                 NOT NULL DEFAULT 0,
    TotalPairs      INT                 NOT NULL DEFAULT 0,
    TotalWeight     DECIMAL(10,2)       NOT NULL DEFAULT 0,
    TransportMode   NVARCHAR(50)        NULL,
    LogisticsPartner NVARCHAR(200)      NULL,
    VehicleNumber   NVARCHAR(50)        NULL,
    PlaceOfSupply   NVARCHAR(100)       NULL,
    LRNumber        NVARCHAR(50)        NULL,
    LRDate          DATE                NULL,
    Notes           NVARCHAR(500)       NULL,
    Status          NVARCHAR(20)        NOT NULL DEFAULT 'Draft',
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_PackingLists PRIMARY KEY (PackingListId),
    CONSTRAINT FK_PackingLists_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_PackingLists_Invoice FOREIGN KEY (InvoiceId) REFERENCES billing.Invoices(InvoiceId)
);
GO

-- billing.PackingListLines: full column set
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='PackingListLines' AND schema_id=SCHEMA_ID('billing'))
CREATE TABLE billing.PackingListLines (
    PackingLineId       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    PackingListId       UNIQUEIDENTIFIER    NOT NULL,
    CartonNumber        INT                 NOT NULL,
    ArticleId           UNIQUEIDENTIFIER    NOT NULL,
    SKU                 NVARCHAR(100)       NULL,
    ArticleName         NVARCHAR(500)       NULL,
    Description         NVARCHAR(1000)      NULL,
    Color               NVARCHAR(100)       NULL,
    EuroSize            INT                 NULL,
    HSNCode             NVARCHAR(20)        NULL,
    SizeBreakdownJson   NVARCHAR(2000)      NULL,
    Quantity            INT                 NOT NULL,
    Weight              DECIMAL(10,2)       NOT NULL DEFAULT 0,
    CONSTRAINT PK_PackingListLines PRIMARY KEY (PackingLineId),
    CONSTRAINT FK_PackListLines_PackList FOREIGN KEY (PackingListId) REFERENCES billing.PackingLists(PackingListId),
    CONSTRAINT FK_PackListLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

-- billing.DeliveryNotes: uses PackingListId (migration 014), full column set
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='DeliveryNotes' AND schema_id=SCHEMA_ID('billing'))
CREATE TABLE billing.DeliveryNotes (
    DeliveryNoteId  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    InvoiceId       UNIQUEIDENTIFIER    NULL,
    PackingListId   UNIQUEIDENTIFIER    NULL,
    DeliveryNoteNo  NVARCHAR(50)        NOT NULL,
    DeliveryDate    DATE                NOT NULL,
    DispatchDate    DATE                NULL,
    ReceivedBy      NVARCHAR(200)       NULL,
    ReceivedAt      DATETIME2(7)        NULL,
    TransporterName NVARCHAR(250)       NULL,
    VehicleNumber   NVARCHAR(50)        NULL,
    LRNumber        NVARCHAR(100)       NULL,
    Status          NVARCHAR(20)        NOT NULL DEFAULT 'Created',
    IsActive        BIT                 NOT NULL DEFAULT 1,
    Notes           NVARCHAR(500)       NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_DeliveryNotes PRIMARY KEY (DeliveryNoteId),
    CONSTRAINT FK_DelNotes_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_DelNotes_PackingList FOREIGN KEY (PackingListId) REFERENCES billing.PackingLists(PackingListId)
);
GO

PRINT 'Billing tables ready.';
GO

PRINT '=== FILE 1 COMPLETE: All schemas and tables created ===';
GO
