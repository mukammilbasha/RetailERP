-- ====================================================================
-- RetailERP — MASTER SETUP SCRIPT
-- Run once: creates DB + schemas + tables + indexes + SPs + seed data
-- Safe to re-run (IF NOT EXISTS guards throughout)
-- Target: SQL Server Express 2014+ (.\SQLEXPRESS, ERPAdmin/ERP@admin)
-- ====================================================================

-- ====================================================================
-- PART 1 : DATABASE & SCHEMAS
-- ====================================================================
USE master;
GO
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'RetailERP')
    CREATE DATABASE RetailERP;
GO
USE RetailERP;
GO
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'auth')       EXEC('CREATE SCHEMA auth');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'master')     EXEC('CREATE SCHEMA master');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'product')    EXEC('CREATE SCHEMA product');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'inventory')  EXEC('CREATE SCHEMA inventory');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'production') EXEC('CREATE SCHEMA production');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'sales')      EXEC('CREATE SCHEMA sales');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'billing')    EXEC('CREATE SCHEMA billing');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'warehouse')  EXEC('CREATE SCHEMA warehouse');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'audit')      EXEC('CREATE SCHEMA audit');
GO
PRINT '>> PART 1: Database and schemas ready.';
GO

-- ====================================================================
-- PART 2 : TABLES
-- ====================================================================

-- ── auth.Tenants ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Tenants' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.Tenants (
    TenantId    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantName  NVARCHAR(200)    NOT NULL,
    TenantCode  NVARCHAR(50)     NOT NULL,
    CompanyName NVARCHAR(300)    NOT NULL,
    GSTIN       NVARCHAR(15)     NULL,
    PAN         NVARCHAR(10)     NULL,
    Address     NVARCHAR(500)    NULL,
    City        NVARCHAR(100)    NULL,
    State       NVARCHAR(100)    NULL,
    PinCode     NVARCHAR(10)     NULL,
    Phone       NVARCHAR(20)     NULL,
    Email       NVARCHAR(200)    NULL,
    LogoUrl     NVARCHAR(500)    NULL,
    IsActive    BIT              NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2(7)     NULL,
    CONSTRAINT PK_Tenants PRIMARY KEY (TenantId),
    CONSTRAINT UQ_Tenants_Code UNIQUE (TenantCode)
);
GO

-- ── auth.Roles ───────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Roles' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.Roles (
    RoleId      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId    UNIQUEIDENTIFIER NOT NULL,
    RoleName    NVARCHAR(100)    NOT NULL,
    Description NVARCHAR(500)    NULL,
    IsSystem    BIT              NOT NULL DEFAULT 0,
    IsActive    BIT              NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Roles PRIMARY KEY (RoleId),
    CONSTRAINT FK_Roles_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Roles_Name_Tenant UNIQUE (TenantId, RoleName)
);
GO

-- ── auth.Permissions ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Permissions' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.Permissions (
    PermissionId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    Module       NVARCHAR(100)    NOT NULL,
    CanView      BIT              NOT NULL DEFAULT 0,
    CanAdd       BIT              NOT NULL DEFAULT 0,
    CanEdit      BIT              NOT NULL DEFAULT 0,
    CanDelete    BIT              NOT NULL DEFAULT 0,
    CONSTRAINT PK_Permissions PRIMARY KEY (PermissionId),
    CONSTRAINT UQ_Permissions_Module UNIQUE (Module)
);
GO

-- ── auth.RolePermissions ────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='RolePermissions' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.RolePermissions (
    RolePermissionId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    RoleId       UNIQUEIDENTIFIER NOT NULL,
    PermissionId UNIQUEIDENTIFIER NOT NULL,
    CanView      BIT              NOT NULL DEFAULT 0,
    CanAdd       BIT              NOT NULL DEFAULT 0,
    CanEdit      BIT              NOT NULL DEFAULT 0,
    CanDelete    BIT              NOT NULL DEFAULT 0,
    CONSTRAINT PK_RolePermissions PRIMARY KEY (RolePermissionId),
    CONSTRAINT FK_RolePerm_Role FOREIGN KEY (RoleId) REFERENCES auth.Roles(RoleId),
    CONSTRAINT FK_RolePerm_Perm FOREIGN KEY (PermissionId) REFERENCES auth.Permissions(PermissionId),
    CONSTRAINT UQ_RolePerm UNIQUE (RoleId, PermissionId)
);
GO

-- ── auth.Users ───────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Users' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.Users (
    UserId        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId      UNIQUEIDENTIFIER NOT NULL,
    FullName      NVARCHAR(200)    NOT NULL,
    Email         NVARCHAR(200)    NOT NULL,
    PasswordHash  NVARCHAR(500)    NOT NULL,
    RoleId        UNIQUEIDENTIFIER NOT NULL,
    AvatarUrl     NVARCHAR(500)    NULL,
    IsActive      BIT              NOT NULL DEFAULT 1,
    IsFirstLogin  BIT              NOT NULL DEFAULT 1,
    LastLoginAt   DATETIME2(7)     NULL,
    CreatedAt     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2(7)     NULL,
    CreatedBy     UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_Users PRIMARY KEY (UserId),
    CONSTRAINT FK_Users_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Users_Role   FOREIGN KEY (RoleId)   REFERENCES auth.Roles(RoleId),
    CONSTRAINT UQ_Users_Email_Tenant UNIQUE (TenantId, Email)
);
GO

-- ── auth.RefreshTokens ───────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='RefreshTokens' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.RefreshTokens (
    TokenId         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    UserId          UNIQUEIDENTIFIER NOT NULL,
    Token           NVARCHAR(500)    NOT NULL,
    ExpiresAt       DATETIME2(7)     NOT NULL,
    CreatedAt       DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    RevokedAt       DATETIME2(7)     NULL,
    ReplacedByToken NVARCHAR(500)    NULL,
    CONSTRAINT PK_RefreshTokens PRIMARY KEY (TokenId),
    CONSTRAINT FK_RefreshTokens_User FOREIGN KEY (UserId) REFERENCES auth.Users(UserId)
);
GO

-- ── auth.TenantSettings ──────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='TenantSettings' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.TenantSettings (
    SettingsId          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId            UNIQUEIDENTIFIER NOT NULL,
    CompanyName         NVARCHAR(200)    NULL,
    CompanyLogo         NVARCHAR(500)    NULL,
    TradeName           NVARCHAR(200)    NULL,
    Subtitle            NVARCHAR(200)    NULL,
    GSTIN               NVARCHAR(20)     NULL,
    PAN                 NVARCHAR(15)     NULL,
    CIN                 NVARCHAR(25)     NULL,
    AddressLine1        NVARCHAR(200)    NULL,
    AddressLine2        NVARCHAR(200)    NULL,
    AddressLine3        NVARCHAR(200)    NULL,
    City                NVARCHAR(100)    NULL,
    State               NVARCHAR(100)    NULL,
    Pincode             NVARCHAR(10)     NULL,
    Country             NVARCHAR(50)     NOT NULL DEFAULT 'India',
    Phone               NVARCHAR(20)     NULL,
    Email               NVARCHAR(200)    NULL,
    Website             NVARCHAR(200)    NULL,
    BankAccountName     NVARCHAR(200)    NULL,
    BankName            NVARCHAR(200)    NULL,
    BankBranch          NVARCHAR(200)    NULL,
    BankAccountNo       NVARCHAR(30)     NULL,
    BankIFSCode         NVARCHAR(15)     NULL,
    GSTRegType          NVARCHAR(20)     NOT NULL DEFAULT 'Regular',
    GSTRateFootwearLow  DECIMAL(5,2)     NOT NULL DEFAULT 5.00,
    GSTRateFootwearHigh DECIMAL(5,2)     NOT NULL DEFAULT 18.00,
    GSTRateOther        DECIMAL(5,2)     NOT NULL DEFAULT 18.00,
    HSNPrefix           NVARCHAR(10)     NULL,
    InvoicePrefix       NVARCHAR(20)     NULL,
    InvoiceFormat       NVARCHAR(100)    NULL,
    FYStartMonth        INT              NOT NULL DEFAULT 4,
    TermsAndConditions  NVARCHAR(MAX)    NULL,
    Declaration         NVARCHAR(MAX)    NULL,
    AuthorisedSignatory NVARCHAR(200)    NULL,
    UpdatedAt           DATETIME2(7)     NULL,
    CONSTRAINT PK_TenantSettings PRIMARY KEY (SettingsId),
    CONSTRAINT FK_TenantSettings_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_TenantSettings_Tenant UNIQUE (TenantId)
);
GO

-- ── auth.Licenses ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Licenses' AND schema_id=SCHEMA_ID('auth'))
CREATE TABLE auth.Licenses (
    LicenseId      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId       UNIQUEIDENTIFIER NOT NULL,
    LicenseKey     NVARCHAR(30)     NOT NULL,
    PlanName       NVARCHAR(30)     NOT NULL DEFAULT 'Starter',
    Status         NVARCHAR(20)     NOT NULL DEFAULT 'Active',
    MaxUsers       INT              NOT NULL DEFAULT 5,
    ValidFrom      DATE             NOT NULL DEFAULT GETDATE(),
    ValidUntil     DATE             NOT NULL,
    ModulesEnabled NVARCHAR(MAX)    NULL,
    ActivatedBy    UNIQUEIDENTIFIER NULL,
    ActivatedAt    DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedAt      DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Licenses PRIMARY KEY (LicenseId),
    CONSTRAINT FK_Licenses_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

-- ── audit.AuditLog ───────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='AuditLog' AND schema_id=SCHEMA_ID('audit'))
CREATE TABLE audit.AuditLog (
    AuditId    BIGINT IDENTITY(1,1) NOT NULL,
    TenantId   UNIQUEIDENTIFIER NOT NULL,
    UserId     UNIQUEIDENTIFIER NULL,
    Action     NVARCHAR(50)     NOT NULL,
    EntityType NVARCHAR(100)    NOT NULL,
    EntityId   NVARCHAR(100)    NULL,
    OldValues  NVARCHAR(MAX)    NULL,
    NewValues  NVARCHAR(MAX)    NULL,
    IpAddress  NVARCHAR(50)     NULL,
    UserAgent  NVARCHAR(500)    NULL,
    Timestamp  DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_AuditLog PRIMARY KEY CLUSTERED (AuditId)
);
GO

-- ── master.States ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='States' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.States (
    StateId   INT           NOT NULL,
    StateName NVARCHAR(100) NOT NULL,
    StateCode NVARCHAR(5)   NOT NULL,
    Zone      NVARCHAR(20)  NOT NULL,
    CONSTRAINT PK_States PRIMARY KEY (StateId),
    CONSTRAINT UQ_States_Code UNIQUE (StateCode)
);
GO

-- ── master.HSNCodes ──────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='HSNCodes' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.HSNCodes (
    HSNId       UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    HSNCode     NVARCHAR(20)     NOT NULL,
    Description NVARCHAR(500)    NULL,
    GSTRate     DECIMAL(5,2)     NOT NULL DEFAULT 18.00,
    CONSTRAINT PK_HSNCodes PRIMARY KEY (HSNId),
    CONSTRAINT UQ_HSNCodes_Code UNIQUE (HSNCode)
);
GO

-- ── master.Brands ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Brands' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Brands (
    BrandId   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId  UNIQUEIDENTIFIER NOT NULL,
    BrandName NVARCHAR(200)    NOT NULL,
    IsActive  BIT              NOT NULL DEFAULT 1,
    CreatedAt DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(7)     NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_Brands PRIMARY KEY (BrandId),
    CONSTRAINT FK_Brands_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Brands_Name_Tenant UNIQUE (TenantId, BrandName)
);
GO

-- ── master.Genders ───────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Genders' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Genders (
    GenderId   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId   UNIQUEIDENTIFIER NOT NULL,
    GenderName NVARCHAR(50)     NOT NULL,
    IsActive   BIT              NOT NULL DEFAULT 1,
    CreatedAt  DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt  DATETIME2(7)     NULL,
    CreatedBy  UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_Genders PRIMARY KEY (GenderId),
    CONSTRAINT FK_Genders_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Genders_Name_Tenant UNIQUE (TenantId, GenderName)
);
GO

-- ── master.Seasons ───────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Seasons' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Seasons (
    SeasonId   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId   UNIQUEIDENTIFIER NOT NULL,
    SeasonCode NVARCHAR(20)     NOT NULL,
    StartDate  DATE             NOT NULL,
    EndDate    DATE             NOT NULL,
    IsActive   BIT              NOT NULL DEFAULT 1,
    CreatedAt  DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt  DATETIME2(7)     NULL,
    CreatedBy  UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_Seasons PRIMARY KEY (SeasonId),
    CONSTRAINT FK_Seasons_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Seasons_Code_Tenant UNIQUE (TenantId, SeasonCode),
    CONSTRAINT CK_Seasons_Dates CHECK (EndDate > StartDate)
);
GO

-- ── master.Segments ──────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Segments' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Segments (
    SegmentId   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId    UNIQUEIDENTIFIER NOT NULL,
    SegmentName NVARCHAR(200)    NOT NULL,
    IsActive    BIT              NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2(7)     NULL,
    CreatedBy   UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_Segments PRIMARY KEY (SegmentId),
    CONSTRAINT FK_Segments_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Segments_Name_Tenant UNIQUE (TenantId, SegmentName)
);
GO

-- ── master.SubSegments ───────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='SubSegments' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.SubSegments (
    SubSegmentId   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId       UNIQUEIDENTIFIER NOT NULL,
    SegmentId      UNIQUEIDENTIFIER NOT NULL,
    SubSegmentName NVARCHAR(200)    NOT NULL,
    IsActive       BIT              NOT NULL DEFAULT 1,
    CreatedAt      DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt      DATETIME2(7)     NULL,
    CreatedBy      UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_SubSegments PRIMARY KEY (SubSegmentId),
    CONSTRAINT FK_SubSegments_Segment FOREIGN KEY (SegmentId) REFERENCES master.Segments(SegmentId),
    CONSTRAINT FK_SubSegments_Tenant  FOREIGN KEY (TenantId)  REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_SubSegments_Name_Segment UNIQUE (SegmentId, SubSegmentName)
);
GO

-- ── master.Categories ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Categories' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Categories (
    CategoryId   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId     UNIQUEIDENTIFIER NOT NULL,
    CategoryName NVARCHAR(200)    NOT NULL,
    IsActive     BIT              NOT NULL DEFAULT 1,
    CreatedAt    DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt    DATETIME2(7)     NULL,
    CreatedBy    UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_Categories PRIMARY KEY (CategoryId),
    CONSTRAINT FK_Categories_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Categories_Name_Tenant UNIQUE (TenantId, CategoryName)
);
GO

-- ── master.SubCategories ─────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='SubCategories' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.SubCategories (
    SubCategoryId   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER NOT NULL,
    CategoryId      UNIQUEIDENTIFIER NOT NULL,
    SubCategoryName NVARCHAR(200)    NOT NULL,
    IsActive        BIT              NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)     NULL,
    CreatedBy       UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_SubCategories PRIMARY KEY (SubCategoryId),
    CONSTRAINT FK_SubCategories_Category FOREIGN KEY (CategoryId) REFERENCES master.Categories(CategoryId),
    CONSTRAINT FK_SubCategories_Tenant   FOREIGN KEY (TenantId)   REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_SubCategories_Name_Cat UNIQUE (CategoryId, SubCategoryName)
);
GO

-- ── master.Groups ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Groups' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Groups (
    GroupId   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId  UNIQUEIDENTIFIER NOT NULL,
    GroupName NVARCHAR(200)    NOT NULL,
    IsActive  BIT              NOT NULL DEFAULT 1,
    CreatedAt DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(7)     NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_Groups PRIMARY KEY (GroupId),
    CONSTRAINT FK_Groups_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Groups_Name_Tenant UNIQUE (TenantId, GroupName)
);
GO

-- ── master.Colors ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Colors' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Colors (
    ColorId   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId  UNIQUEIDENTIFIER NOT NULL,
    ColorName NVARCHAR(100)    NOT NULL,
    ColorCode NVARCHAR(20)     NULL,
    IsActive  BIT              NOT NULL DEFAULT 1,
    CreatedAt DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Colors PRIMARY KEY (ColorId),
    CONSTRAINT FK_Colors_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Colors_Name_Tenant UNIQUE (TenantId, ColorName)
);
GO

-- ── master.Styles ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Styles' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Styles (
    StyleId   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId  UNIQUEIDENTIFIER NOT NULL,
    StyleName NVARCHAR(100)    NOT NULL,
    IsActive  BIT              NOT NULL DEFAULT 1,
    CreatedAt DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Styles PRIMARY KEY (StyleId),
    CONSTRAINT FK_Styles_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

-- ── master.Fasteners ─────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Fasteners' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.Fasteners (
    FastenerId   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId     UNIQUEIDENTIFIER NOT NULL,
    FastenerName NVARCHAR(100)    NOT NULL,
    IsActive     BIT              NOT NULL DEFAULT 1,
    CreatedAt    DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Fasteners PRIMARY KEY (FastenerId),
    CONSTRAINT FK_Fasteners_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

-- ── master.SizeCharts ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='SizeCharts' AND schema_id=SCHEMA_ID('master'))
CREATE TABLE master.SizeCharts (
    SizeChartId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId    UNIQUEIDENTIFIER NOT NULL,
    ChartType   NVARCHAR(50)     NOT NULL,
    GenderId    UNIQUEIDENTIFIER NOT NULL,
    AgeGroup    NVARCHAR(50)     NOT NULL DEFAULT 'Adult',
    USSize      DECIMAL(5,1)     NULL,
    EuroSize    INT              NULL,
    UKSize      DECIMAL(5,1)     NULL,
    IndSize     DECIMAL(5,1)     NULL,
    Inches      DECIMAL(8,4)     NULL,
    CM          DECIMAL(5,1)     NULL,
    IsActive    BIT              NOT NULL DEFAULT 1,
    CONSTRAINT PK_SizeCharts PRIMARY KEY (SizeChartId),
    CONSTRAINT FK_SizeCharts_Tenant FOREIGN KEY (TenantId)  REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_SizeCharts_Gender FOREIGN KEY (GenderId)  REFERENCES master.Genders(GenderId)
);
GO

-- ── product.Articles ─────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Articles' AND schema_id=SCHEMA_ID('product'))
CREATE TABLE product.Articles (
    ArticleId     UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId      UNIQUEIDENTIFIER NOT NULL,
    ArticleCode   NVARCHAR(50)     NOT NULL,
    ArticleName   NVARCHAR(300)    NOT NULL,
    BrandId       UNIQUEIDENTIFIER NOT NULL,
    SegmentId     UNIQUEIDENTIFIER NOT NULL,
    SubSegmentId  UNIQUEIDENTIFIER NULL,
    CategoryId    UNIQUEIDENTIFIER NOT NULL,
    SubCategoryId UNIQUEIDENTIFIER NULL,
    GroupId       UNIQUEIDENTIFIER NULL,
    SeasonId      UNIQUEIDENTIFIER NULL,
    GenderId      UNIQUEIDENTIFIER NOT NULL,
    ColorId       UNIQUEIDENTIFIER NULL,
    Color         NVARCHAR(100)    NOT NULL,
    Style         NVARCHAR(100)    NULL,
    Fastener      NVARCHAR(100)    NULL,
    HSNCode       NVARCHAR(20)     NOT NULL,
    UOM           NVARCHAR(20)     NOT NULL DEFAULT 'PAIRS',
    MRP           DECIMAL(12,2)    NOT NULL DEFAULT 0,
    CBD           DECIMAL(12,2)    NOT NULL DEFAULT 0,
    IsSizeBased   BIT              NOT NULL DEFAULT 1,
    ImageUrl      NVARCHAR(500)    NULL,
    LaunchDate    DATE             NULL,
    IsActive      BIT              NOT NULL DEFAULT 1,
    CreatedAt     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2(7)     NULL,
    CreatedBy     UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_Articles PRIMARY KEY (ArticleId),
    CONSTRAINT FK_Articles_Tenant      FOREIGN KEY (TenantId)      REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Articles_Brand       FOREIGN KEY (BrandId)       REFERENCES master.Brands(BrandId),
    CONSTRAINT FK_Articles_Segment     FOREIGN KEY (SegmentId)     REFERENCES master.Segments(SegmentId),
    CONSTRAINT FK_Articles_SubSegment  FOREIGN KEY (SubSegmentId)  REFERENCES master.SubSegments(SubSegmentId),
    CONSTRAINT FK_Articles_Category    FOREIGN KEY (CategoryId)    REFERENCES master.Categories(CategoryId),
    CONSTRAINT FK_Articles_SubCategory FOREIGN KEY (SubCategoryId) REFERENCES master.SubCategories(SubCategoryId),
    CONSTRAINT FK_Articles_Group       FOREIGN KEY (GroupId)       REFERENCES master.Groups(GroupId),
    CONSTRAINT FK_Articles_Season      FOREIGN KEY (SeasonId)      REFERENCES master.Seasons(SeasonId),
    CONSTRAINT FK_Articles_Gender      FOREIGN KEY (GenderId)      REFERENCES master.Genders(GenderId),
    CONSTRAINT UQ_Articles_Code_Tenant UNIQUE (TenantId, ArticleCode)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='FootwearDetails' AND schema_id=SCHEMA_ID('product'))
CREATE TABLE product.FootwearDetails (
    FootwearDetailId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    ArticleId        UNIQUEIDENTIFIER NOT NULL,
    Last             NVARCHAR(100)    NULL,
    UpperLeather     NVARCHAR(200)    NULL,
    LiningLeather    NVARCHAR(200)    NULL,
    Sole             NVARCHAR(200)    NULL,
    SizeRunFrom      INT              NULL,
    SizeRunTo        INT              NULL,
    CONSTRAINT PK_FootwearDetails PRIMARY KEY (FootwearDetailId),
    CONSTRAINT FK_FootwearDetails_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT UQ_FootwearDetails_Article UNIQUE (ArticleId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='LeatherGoodsDetails' AND schema_id=SCHEMA_ID('product'))
CREATE TABLE product.LeatherGoodsDetails (
    LeatherGoodsDetailId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    ArticleId  UNIQUEIDENTIFIER NOT NULL,
    Dimensions NVARCHAR(100)    NULL,
    Security   NVARCHAR(100)    NULL,
    CONSTRAINT PK_LeatherGoodsDetails PRIMARY KEY (LeatherGoodsDetailId),
    CONSTRAINT FK_LeatherGoods_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT UQ_LeatherGoods_Article UNIQUE (ArticleId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='ArticleSizes' AND schema_id=SCHEMA_ID('product'))
CREATE TABLE product.ArticleSizes (
    ArticleSizeId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    ArticleId     UNIQUEIDENTIFIER NOT NULL,
    EuroSize      INT              NOT NULL,
    UKSize        DECIMAL(5,1)     NULL,
    USSize        DECIMAL(5,1)     NULL,
    EANCode       NVARCHAR(20)     NULL,
    MRP           DECIMAL(12,2)    NULL,
    IsActive      BIT              NOT NULL DEFAULT 1,
    CONSTRAINT PK_ArticleSizes PRIMARY KEY (ArticleSizeId),
    CONSTRAINT FK_ArticleSizes_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT UQ_ArticleSizes_Article_Size UNIQUE (ArticleId, EuroSize)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='ArticleImages' AND schema_id=SCHEMA_ID('product'))
CREATE TABLE product.ArticleImages (
    ImageId      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    ArticleId    UNIQUEIDENTIFIER NOT NULL,
    ImageUrl     NVARCHAR(500)    NOT NULL,
    DisplayOrder INT              NOT NULL DEFAULT 0,
    IsPrimary    BIT              NOT NULL DEFAULT 0,
    CreatedAt    DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ArticleImages PRIMARY KEY (ImageId),
    CONSTRAINT FK_ArticleImages_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

-- ── warehouse.Warehouses ─────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Warehouses' AND schema_id=SCHEMA_ID('warehouse'))
CREATE TABLE warehouse.Warehouses (
    WarehouseId   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId      UNIQUEIDENTIFIER NOT NULL,
    WarehouseCode NVARCHAR(50)     NOT NULL,
    WarehouseName NVARCHAR(300)    NOT NULL,
    Address       NVARCHAR(500)    NULL,
    City          NVARCHAR(100)    NULL,
    State         NVARCHAR(100)    NULL,
    PinCode       NVARCHAR(10)     NULL,
    IsActive      BIT              NOT NULL DEFAULT 1,
    CreatedAt     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2(7)     NULL,
    CreatedBy     UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_Warehouses PRIMARY KEY (WarehouseId),
    CONSTRAINT FK_Warehouses_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Warehouses_Code_Tenant UNIQUE (TenantId, WarehouseCode)
);
GO

-- ── inventory tables ─────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockLedger' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockLedger (
    StockLedgerId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId      UNIQUEIDENTIFIER NOT NULL,
    WarehouseId   UNIQUEIDENTIFIER NOT NULL,
    ArticleId     UNIQUEIDENTIFIER NOT NULL,
    EuroSize      INT              NULL,
    OpeningStock  INT              NOT NULL DEFAULT 0,
    InwardQty     INT              NOT NULL DEFAULT 0,
    OutwardQty    INT              NOT NULL DEFAULT 0,
    ClosingStock  AS (OpeningStock + InwardQty - OutwardQty) PERSISTED,
    LastUpdated   DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_StockLedger PRIMARY KEY (StockLedgerId),
    CONSTRAINT FK_StockLedger_Tenant    FOREIGN KEY (TenantId)    REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_StockLedger_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT FK_StockLedger_Article   FOREIGN KEY (ArticleId)   REFERENCES product.Articles(ArticleId),
    CONSTRAINT UQ_StockLedger UNIQUE (TenantId, WarehouseId, ArticleId, EuroSize),
    CONSTRAINT CK_StockLedger_Positive CHECK (OpeningStock + InwardQty - OutwardQty >= 0)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockMovements' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockMovements (
    MovementId    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId      UNIQUEIDENTIFIER NOT NULL,
    WarehouseId   UNIQUEIDENTIFIER NOT NULL,
    ArticleId     UNIQUEIDENTIFIER NOT NULL,
    EuroSize      INT              NULL,
    MovementType  NVARCHAR(30)     NOT NULL,
    Direction     NVARCHAR(10)     NOT NULL,
    Quantity      INT              NOT NULL,
    ReferenceType NVARCHAR(50)     NULL,
    ReferenceId   UNIQUEIDENTIFIER NULL,
    Notes         NVARCHAR(500)    NULL,
    MovementDate  DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy     UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_StockMovements PRIMARY KEY (MovementId),
    CONSTRAINT FK_StockMovements_Tenant    FOREIGN KEY (TenantId)    REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_StockMovements_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT FK_StockMovements_Article   FOREIGN KEY (ArticleId)   REFERENCES product.Articles(ArticleId),
    CONSTRAINT CK_StockMovements_Qty  CHECK (Quantity > 0),
    CONSTRAINT CK_StockMovements_Dir  CHECK (Direction IN ('INWARD','OUTWARD')),
    CONSTRAINT CK_StockMovements_Type CHECK (MovementType IN ('OPENING','PURCHASE','PRODUCTION','SALES','RETURN','ADJUSTMENT'))
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockAdjustments' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockAdjustments (
    AdjustmentId   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId       UNIQUEIDENTIFIER NOT NULL,
    WarehouseId    UNIQUEIDENTIFIER NOT NULL,
    AdjustmentNo   NVARCHAR(50)     NOT NULL,
    AdjustmentDate DATE             NOT NULL,
    Reason         NVARCHAR(500)    NULL,
    Status         NVARCHAR(20)     NOT NULL DEFAULT 'DRAFT',
    ApprovedBy     UNIQUEIDENTIFIER NULL,
    ApprovedAt     DATETIME2(7)     NULL,
    CreatedAt      DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy      UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_StockAdjustments PRIMARY KEY (AdjustmentId),
    CONSTRAINT FK_StockAdj_Tenant    FOREIGN KEY (TenantId)    REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_StockAdj_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockAdjustmentLines' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockAdjustmentLines (
    AdjustmentLineId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    AdjustmentId     UNIQUEIDENTIFIER NOT NULL,
    ArticleId        UNIQUEIDENTIFIER NOT NULL,
    EuroSize         INT              NULL,
    AdjustmentType   NVARCHAR(10)     NOT NULL,
    Quantity         INT              NOT NULL,
    CONSTRAINT PK_StockAdjustmentLines PRIMARY KEY (AdjustmentLineId),
    CONSTRAINT FK_SAL_Adjustment FOREIGN KEY (AdjustmentId) REFERENCES inventory.StockAdjustments(AdjustmentId),
    CONSTRAINT FK_SAL_Article    FOREIGN KEY (ArticleId)    REFERENCES product.Articles(ArticleId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='GoodsReceivedNotes' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.GoodsReceivedNotes (
    GRNId         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId      UNIQUEIDENTIFIER NOT NULL,
    GRNNumber     NVARCHAR(50)     NOT NULL,
    WarehouseId   UNIQUEIDENTIFIER NOT NULL,
    ReceiptDate   DATE             NOT NULL DEFAULT GETDATE(),
    SourceType    NVARCHAR(20)     NOT NULL DEFAULT 'Purchase',
    ReferenceNo   NVARCHAR(100)    NULL,
    Status        NVARCHAR(20)     NOT NULL DEFAULT 'Draft',
    Notes         NVARCHAR(500)    NULL,
    TotalQuantity INT              NOT NULL DEFAULT 0,
    CreatedAt     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2(7)     NULL,
    CreatedBy     UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_GRN PRIMARY KEY (GRNId),
    CONSTRAINT FK_GRN_Tenant    FOREIGN KEY (TenantId)    REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_GRN_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT UQ_GRN_Number_Tenant UNIQUE (TenantId, GRNNumber)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='GRNLines' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.GRNLines (
    GRNLineId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    GRNId     UNIQUEIDENTIFIER NOT NULL,
    ArticleId UNIQUEIDENTIFIER NOT NULL,
    EuroSize  INT              NULL,
    Quantity  INT              NOT NULL DEFAULT 0,
    CONSTRAINT PK_GRNLines PRIMARY KEY (GRNLineId),
    CONSTRAINT FK_GRNLines_GRN     FOREIGN KEY (GRNId)     REFERENCES inventory.GoodsReceivedNotes(GRNId),
    CONSTRAINT FK_GRNLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockFreezes' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockFreezes (
    FreezeId    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId    UNIQUEIDENTIFIER NOT NULL,
    WarehouseId UNIQUEIDENTIFIER NOT NULL,
    FreezeMonth INT              NOT NULL,
    FreezeYear  INT              NOT NULL,
    Status      NVARCHAR(20)     NOT NULL DEFAULT 'Open',
    FrozenAt    DATETIME2(7)     NULL,
    FrozenBy    UNIQUEIDENTIFIER NULL,
    CreatedAt   DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_StockFreeze PRIMARY KEY (FreezeId),
    CONSTRAINT FK_StockFreeze_Tenant    FOREIGN KEY (TenantId)    REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_StockFreeze_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT UQ_StockFreeze UNIQUE (TenantId, WarehouseId, FreezeMonth, FreezeYear)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='StockFreezeLines' AND schema_id=SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockFreezeLines (
    FreezeLineId     UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    FreezeId         UNIQUEIDENTIFIER NOT NULL,
    ArticleId        UNIQUEIDENTIFIER NOT NULL,
    EuroSize         INT              NULL,
    OpeningQty       INT              NOT NULL DEFAULT 0,
    OpeningValue     DECIMAL(18,2)    NOT NULL DEFAULT 0,
    ReceivedQty      INT              NOT NULL DEFAULT 0,
    ReceivedValue    DECIMAL(18,2)    NOT NULL DEFAULT 0,
    IssuedQty        INT              NOT NULL DEFAULT 0,
    IssuedValue      DECIMAL(18,2)    NOT NULL DEFAULT 0,
    ReturnQty        INT              NOT NULL DEFAULT 0,
    ReturnValue      DECIMAL(18,2)    NOT NULL DEFAULT 0,
    ClosingQty       INT              NOT NULL DEFAULT 0,
    ClosingValue     DECIMAL(18,2)    NOT NULL DEFAULT 0,
    CONSTRAINT PK_StockFreezeLines PRIMARY KEY (FreezeLineId),
    CONSTRAINT FK_StockFreezeLines_Freeze  FOREIGN KEY (FreezeId)  REFERENCES inventory.StockFreezes(FreezeId),
    CONSTRAINT FK_StockFreezeLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

-- ── production tables ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='ProductionOrders' AND schema_id=SCHEMA_ID('production'))
CREATE TABLE production.ProductionOrders (
    ProductionOrderId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId          UNIQUEIDENTIFIER NOT NULL,
    OrderNo           NVARCHAR(50)     NOT NULL,
    OrderDate         DATE             NOT NULL,
    ArticleId         UNIQUEIDENTIFIER NOT NULL,
    GroupId           UNIQUEIDENTIFIER NULL,
    Color             NVARCHAR(100)    NOT NULL,
    Last              NVARCHAR(100)    NULL,
    UpperLeather      NVARCHAR(200)    NULL,
    LiningLeather     NVARCHAR(200)    NULL,
    Sole              NVARCHAR(200)    NULL,
    OrderType         NVARCHAR(50)     NOT NULL DEFAULT 'REPLENISHMENT',
    TotalQuantity     INT              NOT NULL DEFAULT 0,
    Status            NVARCHAR(30)     NOT NULL DEFAULT 'DRAFT',
    Notes             NVARCHAR(1000)   NULL,
    ApprovedBy        UNIQUEIDENTIFIER NULL,
    ApprovedAt        DATETIME2(7)     NULL,
    CompletedAt       DATETIME2(7)     NULL,
    CreatedAt         DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt         DATETIME2(7)     NULL,
    CreatedBy         UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_ProductionOrders PRIMARY KEY (ProductionOrderId),
    CONSTRAINT FK_ProdOrders_Tenant  FOREIGN KEY (TenantId)  REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_ProdOrders_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT UQ_ProdOrders_No_Tenant UNIQUE (TenantId, OrderNo),
    CONSTRAINT CK_ProdOrders_Status CHECK (Status IN ('DRAFT','APPROVED','IN_PRODUCTION','COMPLETED','CANCELLED'))
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='ProductionSizeRuns' AND schema_id=SCHEMA_ID('production'))
CREATE TABLE production.ProductionSizeRuns (
    SizeRunId         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    ProductionOrderId UNIQUEIDENTIFIER NOT NULL,
    EuroSize          INT              NOT NULL,
    Quantity          INT              NOT NULL DEFAULT 0,
    ProducedQty       INT              NOT NULL DEFAULT 0,
    CONSTRAINT PK_ProductionSizeRuns PRIMARY KEY (SizeRunId),
    CONSTRAINT FK_ProdSizeRun_Order FOREIGN KEY (ProductionOrderId) REFERENCES production.ProductionOrders(ProductionOrderId),
    CONSTRAINT UQ_ProdSizeRun UNIQUE (ProductionOrderId, EuroSize)
);
GO

-- ── sales tables ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Clients' AND schema_id=SCHEMA_ID('sales'))
CREATE TABLE sales.Clients (
    ClientId      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId      UNIQUEIDENTIFIER NOT NULL,
    ClientCode    NVARCHAR(50)     NOT NULL,
    ClientName    NVARCHAR(300)    NOT NULL,
    Organisation  NVARCHAR(300)    NULL,
    GSTIN         NVARCHAR(15)     NULL,
    PAN           NVARCHAR(10)     NULL,
    StateId       INT              NULL,
    StateCode     NVARCHAR(5)      NULL,
    Zone          NVARCHAR(20)     NULL,
    Email         NVARCHAR(200)    NULL,
    ContactNo     NVARCHAR(20)     NULL,
    MarginPercent DECIMAL(5,2)     NOT NULL DEFAULT 0,
    MarginType    NVARCHAR(20)     NOT NULL DEFAULT 'NET OF TAXES',
    IsActive      BIT              NOT NULL DEFAULT 1,
    CreatedAt     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2(7)     NULL,
    CreatedBy     UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_Clients PRIMARY KEY (ClientId),
    CONSTRAINT FK_Clients_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Clients_State  FOREIGN KEY (StateId)  REFERENCES master.States(StateId),
    CONSTRAINT UQ_Clients_Code_Tenant UNIQUE (TenantId, ClientCode)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Stores' AND schema_id=SCHEMA_ID('sales'))
CREATE TABLE sales.Stores (
    StoreId       UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId      UNIQUEIDENTIFIER NOT NULL,
    ClientId      UNIQUEIDENTIFIER NOT NULL,
    StoreCode     NVARCHAR(50)     NOT NULL,
    StoreName     NVARCHAR(300)    NOT NULL,
    Format        NVARCHAR(50)     NULL,
    Organisation  NVARCHAR(300)    NULL,
    City          NVARCHAR(100)    NULL,
    State         NVARCHAR(100)    NULL,
    Channel       NVARCHAR(50)     NULL,
    ModusOperandi NVARCHAR(10)     NULL,
    MarginPercent DECIMAL(5,2)     NOT NULL DEFAULT 0,
    MarginType    NVARCHAR(20)     NOT NULL DEFAULT 'NET OF TAXES',
    ManagerName   NVARCHAR(200)    NULL,
    Email         NVARCHAR(200)    NULL,
    GSTIN         NVARCHAR(15)     NULL,
    PAN           NVARCHAR(10)     NULL,
    IsActive      BIT              NOT NULL DEFAULT 1,
    CreatedAt     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2(7)     NULL,
    CreatedBy     UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_Stores PRIMARY KEY (StoreId),
    CONSTRAINT FK_Stores_Tenant FOREIGN KEY (TenantId)  REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Stores_Client FOREIGN KEY (ClientId)  REFERENCES sales.Clients(ClientId),
    CONSTRAINT UQ_Stores_Code_Tenant UNIQUE (TenantId, StoreCode)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CustomerMasterEntries' AND schema_id=SCHEMA_ID('sales'))
CREATE TABLE sales.CustomerMasterEntries (
    CustomerEntryId  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId         UNIQUEIDENTIFIER NOT NULL,
    StoreId          UNIQUEIDENTIFIER NOT NULL,
    ClientId         UNIQUEIDENTIFIER NOT NULL,
    EntryDate        DATE             NOT NULL,
    StoreCode        NVARCHAR(50)     NULL,
    Organisation     NVARCHAR(300)    NULL,
    BillingAddress1  NVARCHAR(200)    NULL,
    BillingAddress2  NVARCHAR(200)    NULL,
    BillingCity      NVARCHAR(100)    NULL,
    BillingPinCode   NVARCHAR(10)     NULL,
    BillingState     NVARCHAR(100)    NULL,
    BillingStateCode NVARCHAR(5)      NULL,
    BillingZone      NVARCHAR(20)     NULL,
    BillingNumber    NVARCHAR(20)     NULL,
    SameAsBilling    BIT              NOT NULL DEFAULT 0,
    ShippingAddress1 NVARCHAR(200)    NULL,
    ShippingCity     NVARCHAR(100)    NULL,
    ShippingPinCode  NVARCHAR(10)     NULL,
    ShippingState    NVARCHAR(100)    NULL,
    ShippingStateCode NVARCHAR(5)     NULL,
    ShippingZone     NVARCHAR(20)     NULL,
    ShippingNumber   NVARCHAR(20)     NULL,
    ContactName      NVARCHAR(200)    NULL,
    ContactNo        NVARCHAR(20)     NULL,
    Email            NVARCHAR(200)    NULL,
    StoreManager     NVARCHAR(200)    NULL,
    ManagerContact   NVARCHAR(20)     NULL,
    AreaManager      NVARCHAR(200)    NULL,
    AreaContact      NVARCHAR(20)     NULL,
    GSTIN            NVARCHAR(15)     NULL,
    PAN              NVARCHAR(10)     NULL,
    BusinessChannel  NVARCHAR(50)     NULL,
    BusinessModule   NVARCHAR(50)     NULL,
    MarginPercent    DECIMAL(5,2)     NOT NULL DEFAULT 0,
    MarginType       NVARCHAR(20)     NOT NULL DEFAULT 'NET OF TAXES',
    IsActive         BIT              NOT NULL DEFAULT 1,
    CreatedAt        DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt        DATETIME2(7)     NULL,
    CONSTRAINT PK_CustomerMasterEntries PRIMARY KEY (CustomerEntryId),
    CONSTRAINT FK_CME_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_CME_Store  FOREIGN KEY (StoreId)  REFERENCES sales.Stores(StoreId),
    CONSTRAINT FK_CME_Client FOREIGN KEY (ClientId) REFERENCES sales.Clients(ClientId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CustomerOrders' AND schema_id=SCHEMA_ID('sales'))
CREATE TABLE sales.CustomerOrders (
    OrderId       UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId      UNIQUEIDENTIFIER NOT NULL,
    OrderNo       NVARCHAR(50)     NOT NULL,
    OrderDate     DATE             NOT NULL,
    ClientId      UNIQUEIDENTIFIER NOT NULL,
    StoreId       UNIQUEIDENTIFIER NOT NULL,
    WarehouseId   UNIQUEIDENTIFIER NULL,
    TotalQuantity INT              NOT NULL DEFAULT 0,
    TotalMRP      DECIMAL(14,2)    NOT NULL DEFAULT 0,
    TotalAmount   DECIMAL(14,2)    NOT NULL DEFAULT 0,
    Status        NVARCHAR(30)     NOT NULL DEFAULT 'DRAFT',
    Notes         NVARCHAR(1000)   NULL,
    ConfirmedBy   UNIQUEIDENTIFIER NULL,
    ConfirmedAt   DATETIME2(7)     NULL,
    CreatedAt     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2(7)     NULL,
    CreatedBy     UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_CustomerOrders PRIMARY KEY (OrderId),
    CONSTRAINT FK_CustOrders_Tenant    FOREIGN KEY (TenantId)    REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_CustOrders_Client    FOREIGN KEY (ClientId)    REFERENCES sales.Clients(ClientId),
    CONSTRAINT FK_CustOrders_Store     FOREIGN KEY (StoreId)     REFERENCES sales.Stores(StoreId),
    CONSTRAINT FK_CustOrders_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT UQ_CustOrders_No_Tenant UNIQUE (TenantId, OrderNo)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='OrderLines' AND schema_id=SCHEMA_ID('sales'))
CREATE TABLE sales.OrderLines (
    OrderLineId   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    OrderId       UNIQUEIDENTIFIER NOT NULL,
    ArticleId     UNIQUEIDENTIFIER NOT NULL,
    Color         NVARCHAR(100)    NULL,
    EuroSize      INT              NULL,
    HSNCode       NVARCHAR(20)     NOT NULL,
    MRP           DECIMAL(12,2)    NOT NULL,
    Quantity      INT              NOT NULL,
    DispatchedQty INT              NOT NULL DEFAULT 0,
    LineTotal     DECIMAL(14,2)    NOT NULL,
    StockAvailable BIT             NOT NULL DEFAULT 0,
    CONSTRAINT PK_OrderLines PRIMARY KEY (OrderLineId),
    CONSTRAINT FK_OrderLines_Order   FOREIGN KEY (OrderId)   REFERENCES sales.CustomerOrders(OrderId),
    CONSTRAINT FK_OrderLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT CK_OrderLines_Qty CHECK (Quantity > 0)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='OrderSizeRuns' AND schema_id=SCHEMA_ID('sales'))
CREATE TABLE sales.OrderSizeRuns (
    OrderSizeRunId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    OrderLineId    UNIQUEIDENTIFIER NOT NULL,
    EuroSize       INT              NOT NULL,
    Quantity       INT              NOT NULL DEFAULT 0,
    StockAvailable INT              NOT NULL DEFAULT 0,
    CONSTRAINT PK_OrderSizeRuns PRIMARY KEY (OrderSizeRunId),
    CONSTRAINT FK_OrderSizeRuns_OrderLine FOREIGN KEY (OrderLineId) REFERENCES sales.OrderLines(OrderLineId)
);
GO

-- ── billing tables ───────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Invoices' AND schema_id=SCHEMA_ID('billing'))
CREATE TABLE billing.Invoices (
    InvoiceId        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId         UNIQUEIDENTIFIER NOT NULL,
    InvoiceNo        NVARCHAR(50)     NOT NULL,
    InvoiceDate      DATE             NOT NULL,
    InvoiceType      NVARCHAR(30)     NOT NULL DEFAULT 'TAX_INVOICE',
    OrderId          UNIQUEIDENTIFIER NULL,
    OrderNumber      NVARCHAR(100)    NULL,
    ClientId         UNIQUEIDENTIFIER NOT NULL,
    StoreId          UNIQUEIDENTIFIER NOT NULL,
    StoreName        NVARCHAR(250)    NULL,
    BillToName       NVARCHAR(300)    NULL,
    BillToAddress    NVARCHAR(500)    NULL,
    BillToGSTIN      NVARCHAR(15)     NULL,
    BillToState      NVARCHAR(100)    NULL,
    BillToStateCode  NVARCHAR(5)      NULL,
    ShipToName       NVARCHAR(300)    NULL,
    ShipToAddress    NVARCHAR(500)    NULL,
    ShipToGSTIN      NVARCHAR(15)     NULL,
    ShipToState      NVARCHAR(100)    NULL,
    ShipToStateCode  NVARCHAR(5)      NULL,
    PlaceOfSupply    NVARCHAR(100)    NULL,
    PlaceOfSupplyCode NVARCHAR(5)     NULL,
    IsInterState     BIT              NOT NULL DEFAULT 0,
    SalesType        NVARCHAR(20)     NOT NULL DEFAULT 'Local',
    SubTotal         DECIMAL(14,2)    NOT NULL DEFAULT 0,
    TotalDiscount    DECIMAL(14,2)    NOT NULL DEFAULT 0,
    DiscountAmount   DECIMAL(18,2)    NOT NULL DEFAULT 0,
    TaxableAmount    DECIMAL(14,2)    NOT NULL DEFAULT 0,
    CGSTAmount       DECIMAL(14,2)    NOT NULL DEFAULT 0,
    SGSTAmount       DECIMAL(14,2)    NOT NULL DEFAULT 0,
    IGSTAmount       DECIMAL(14,2)    NOT NULL DEFAULT 0,
    TotalGST         DECIMAL(14,2)    NOT NULL DEFAULT 0,
    TotalTax         DECIMAL(18,2)    NOT NULL DEFAULT 0,
    TotalAmount      DECIMAL(18,2)    NOT NULL DEFAULT 0,
    GrandTotal       DECIMAL(14,2)    NOT NULL DEFAULT 0,
    RoundOff         DECIMAL(8,2)     NOT NULL DEFAULT 0,
    NetPayable       DECIMAL(14,2)    NOT NULL DEFAULT 0,
    PaidAmount       DECIMAL(18,2)    NOT NULL DEFAULT 0,
    TotalQuantity    INT              NOT NULL DEFAULT 0,
    CartonBoxes      INT              NOT NULL DEFAULT 0,
    Logistic         NVARCHAR(250)    NULL,
    TransportMode    NVARCHAR(100)    NULL,
    VehicleNo        NVARCHAR(50)     NULL,
    PONumber         NVARCHAR(100)    NULL,
    PODate           DATE             NULL,
    DueDate          DATE             NULL,
    CompanyName      NVARCHAR(500)    NULL,
    CompanyAddress   NVARCHAR(1000)   NULL,
    CompanyGSTIN     NVARCHAR(20)     NULL,
    CompanyPAN       NVARCHAR(20)     NULL,
    BankName         NVARCHAR(250)    NULL,
    BankAccountNo    NVARCHAR(50)     NULL,
    BankIFSC         NVARCHAR(20)     NULL,
    BankBranch       NVARCHAR(250)    NULL,
    IRN              NVARCHAR(100)    NULL,
    EWayBillNo       NVARCHAR(50)     NULL,
    Notes            NVARCHAR(2000)   NULL,
    Status           NVARCHAR(20)     NOT NULL DEFAULT 'Draft',
    IsActive         BIT              NOT NULL DEFAULT 1,
    CreatedAt        DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt        DATETIME2(7)     NULL,
    CreatedBy        UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_Invoices PRIMARY KEY (InvoiceId),
    CONSTRAINT FK_Invoices_Tenant FOREIGN KEY (TenantId)  REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Invoices_Order  FOREIGN KEY (OrderId)   REFERENCES sales.CustomerOrders(OrderId),
    CONSTRAINT FK_Invoices_Client FOREIGN KEY (ClientId)  REFERENCES sales.Clients(ClientId),
    CONSTRAINT FK_Invoices_Store  FOREIGN KEY (StoreId)   REFERENCES sales.Stores(StoreId),
    CONSTRAINT UQ_Invoices_No_Tenant UNIQUE (TenantId, InvoiceNo)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='InvoiceLines' AND schema_id=SCHEMA_ID('billing'))
CREATE TABLE billing.InvoiceLines (
    InvoiceLineId          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    InvoiceId              UNIQUEIDENTIFIER NOT NULL,
    LineNumber             INT              NOT NULL DEFAULT 1,
    ArticleId              UNIQUEIDENTIFIER NOT NULL,
    ArticleCode            NVARCHAR(50)     NOT NULL,
    ArticleName            NVARCHAR(300)    NOT NULL,
    SKU                    NVARCHAR(100)    NULL,
    HSNCode                NVARCHAR(20)     NOT NULL,
    Color                  NVARCHAR(100)    NULL,
    EuroSize               INT              NULL,
    Size                   NVARCHAR(50)     NULL,
    EANCode                NVARCHAR(20)     NULL,
    UOM                    NVARCHAR(20)     NOT NULL DEFAULT 'PAIRS',
    Quantity               INT              NOT NULL,
    MRP                    DECIMAL(12,2)    NOT NULL,
    MarginPercent          DECIMAL(5,2)     NOT NULL DEFAULT 0,
    MarginAmount           DECIMAL(12,2)    NOT NULL DEFAULT 0,
    UnitPrice              DECIMAL(12,2)    NOT NULL DEFAULT 0,
    TaxableAmount          DECIMAL(14,2)    NOT NULL DEFAULT 0,
    GSTRate                DECIMAL(5,2)     NOT NULL DEFAULT 18.00,
    CGSTRate               DECIMAL(5,2)     NOT NULL DEFAULT 0,
    CGSTAmount             DECIMAL(12,2)    NOT NULL DEFAULT 0,
    SGSTRate               DECIMAL(5,2)     NOT NULL DEFAULT 0,
    SGSTAmount             DECIMAL(12,2)    NOT NULL DEFAULT 0,
    IGSTRate               DECIMAL(5,2)     NOT NULL DEFAULT 0,
    IGSTAmount             DECIMAL(12,2)    NOT NULL DEFAULT 0,
    TotalAmount            DECIMAL(14,2)    NOT NULL DEFAULT 0,
    LineTotal              DECIMAL(18,2)    NOT NULL DEFAULT 0,
    SizeBreakdownJson      NVARCHAR(2000)   NULL,
    GSTPayablePercent      DECIMAL(5,2)     NOT NULL DEFAULT 0,
    GSTPayableValue        DECIMAL(18,2)    NOT NULL DEFAULT 0,
    GSTReimbursementPercent DECIMAL(5,2)    NOT NULL DEFAULT 0,
    GSTReimbursementValue  DECIMAL(18,2)    NOT NULL DEFAULT 0,
    TotalBilling           DECIMAL(18,2)    NOT NULL DEFAULT 0,
    CONSTRAINT PK_InvoiceLines PRIMARY KEY (InvoiceLineId),
    CONSTRAINT FK_InvLines_Invoice FOREIGN KEY (InvoiceId) REFERENCES billing.Invoices(InvoiceId),
    CONSTRAINT FK_InvLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='PackingLists' AND schema_id=SCHEMA_ID('billing'))
CREATE TABLE billing.PackingLists (
    PackingListId    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId         UNIQUEIDENTIFIER NOT NULL,
    InvoiceId        UNIQUEIDENTIFIER NOT NULL,
    PackingNo        NVARCHAR(50)     NOT NULL,
    PackingDate      DATE             NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    TotalCartons     INT              NOT NULL DEFAULT 0,
    TotalPairs       INT              NOT NULL DEFAULT 0,
    TotalWeight      DECIMAL(10,2)    NOT NULL DEFAULT 0,
    TransportMode    NVARCHAR(50)     NULL,
    LogisticsPartner NVARCHAR(200)    NULL,
    VehicleNumber    NVARCHAR(50)     NULL,
    PlaceOfSupply    NVARCHAR(100)    NULL,
    LRNumber         NVARCHAR(50)     NULL,
    LRDate           DATE             NULL,
    WarehouseId      UNIQUEIDENTIFIER NULL,
    Notes            NVARCHAR(500)    NULL,
    Status           NVARCHAR(20)     NOT NULL DEFAULT 'Draft',
    IsActive         BIT              NOT NULL DEFAULT 1,
    CreatedAt        DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt        DATETIME2(7)     NULL,
    CreatedBy        UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_PackingLists PRIMARY KEY (PackingListId),
    CONSTRAINT FK_PackingLists_Tenant  FOREIGN KEY (TenantId)  REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_PackingLists_Invoice FOREIGN KEY (InvoiceId) REFERENCES billing.Invoices(InvoiceId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='PackingListLines' AND schema_id=SCHEMA_ID('billing'))
CREATE TABLE billing.PackingListLines (
    PackingLineId     UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    PackingListId     UNIQUEIDENTIFIER NOT NULL,
    CartonNumber      INT              NOT NULL,
    ArticleId         UNIQUEIDENTIFIER NOT NULL,
    ArticleName       NVARCHAR(500)    NULL,
    SKU               NVARCHAR(100)    NULL,
    Color             NVARCHAR(100)    NULL,
    HSNCode           NVARCHAR(20)     NULL,
    EuroSize          INT              NULL,
    Quantity          INT              NOT NULL,
    Weight            DECIMAL(10,2)    NOT NULL DEFAULT 0,
    SizeBreakdownJson NVARCHAR(2000)   NULL,
    Description       NVARCHAR(1000)   NULL,
    CONSTRAINT PK_PackingListLines PRIMARY KEY (PackingLineId),
    CONSTRAINT FK_PackListLines_PackList FOREIGN KEY (PackingListId) REFERENCES billing.PackingLists(PackingListId),
    CONSTRAINT FK_PackListLines_Article  FOREIGN KEY (ArticleId)     REFERENCES product.Articles(ArticleId)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='DeliveryNotes' AND schema_id=SCHEMA_ID('billing'))
CREATE TABLE billing.DeliveryNotes (
    DeliveryNoteId  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER NOT NULL,
    InvoiceId       UNIQUEIDENTIFIER NOT NULL,
    PackingListId   UNIQUEIDENTIFIER NULL,
    DeliveryNoteNo  NVARCHAR(50)     NOT NULL,
    DeliveryDate    DATE             NOT NULL,
    DispatchDate    DATE             NULL,
    ReceivedBy      NVARCHAR(200)    NULL,
    ReceivedAt      DATETIME2(7)     NULL,
    TransporterName NVARCHAR(250)    NULL,
    VehicleNumber   NVARCHAR(50)     NULL,
    LRNumber        NVARCHAR(100)    NULL,
    Status          NVARCHAR(20)     NOT NULL DEFAULT 'Created',
    Notes           NVARCHAR(500)    NULL,
    IsActive        BIT              NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)     NULL,
    CreatedBy       UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_DeliveryNotes PRIMARY KEY (DeliveryNoteId),
    CONSTRAINT FK_DelNotes_Tenant      FOREIGN KEY (TenantId)      REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_DelNotes_Invoice     FOREIGN KEY (InvoiceId)     REFERENCES billing.Invoices(InvoiceId),
    CONSTRAINT FK_DelNotes_PackingList FOREIGN KEY (PackingListId) REFERENCES billing.PackingLists(PackingListId)
);
GO

PRINT '>> PART 2: All tables created.';
GO

-- ====================================================================
-- PART 3 : INDEXES
-- ====================================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Users_TenantId'          AND object_id=OBJECT_ID('auth.Users'))         CREATE NONCLUSTERED INDEX IX_Users_TenantId          ON auth.Users(TenantId) INCLUDE (Email,FullName,RoleId,IsActive);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Users_Email'             AND object_id=OBJECT_ID('auth.Users'))         CREATE NONCLUSTERED INDEX IX_Users_Email             ON auth.Users(Email) INCLUDE (TenantId,PasswordHash,IsActive);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_RefreshTokens_UserId'    AND object_id=OBJECT_ID('auth.RefreshTokens')) CREATE NONCLUSTERED INDEX IX_RefreshTokens_UserId    ON auth.RefreshTokens(UserId) INCLUDE (Token,ExpiresAt,RevokedAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_RefreshTokens_Token'     AND object_id=OBJECT_ID('auth.RefreshTokens')) CREATE NONCLUSTERED INDEX IX_RefreshTokens_Token     ON auth.RefreshTokens(Token);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_AuditLog_TenantId'       AND object_id=OBJECT_ID('audit.AuditLog'))     CREATE NONCLUSTERED INDEX IX_AuditLog_TenantId       ON audit.AuditLog(TenantId,Timestamp DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_AuditLog_EntityType'     AND object_id=OBJECT_ID('audit.AuditLog'))     CREATE NONCLUSTERED INDEX IX_AuditLog_EntityType     ON audit.AuditLog(EntityType,EntityId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Brands_TenantId'         AND object_id=OBJECT_ID('master.Brands'))      CREATE NONCLUSTERED INDEX IX_Brands_TenantId         ON master.Brands(TenantId) WHERE IsActive=1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Segments_TenantId'       AND object_id=OBJECT_ID('master.Segments'))    CREATE NONCLUSTERED INDEX IX_Segments_TenantId       ON master.Segments(TenantId) WHERE IsActive=1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_SubSegments_SegmentId'   AND object_id=OBJECT_ID('master.SubSegments')) CREATE NONCLUSTERED INDEX IX_SubSegments_SegmentId   ON master.SubSegments(SegmentId) WHERE IsActive=1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Categories_TenantId'     AND object_id=OBJECT_ID('master.Categories'))  CREATE NONCLUSTERED INDEX IX_Categories_TenantId     ON master.Categories(TenantId) WHERE IsActive=1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_SubCategories_CategoryId' AND object_id=OBJECT_ID('master.SubCategories')) CREATE NONCLUSTERED INDEX IX_SubCategories_CategoryId ON master.SubCategories(CategoryId) WHERE IsActive=1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_SizeCharts_TenantGender' AND object_id=OBJECT_ID('master.SizeCharts'))  CREATE NONCLUSTERED INDEX IX_SizeCharts_TenantGender ON master.SizeCharts(TenantId,GenderId,ChartType);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Articles_TenantId'       AND object_id=OBJECT_ID('product.Articles'))   CREATE NONCLUSTERED INDEX IX_Articles_TenantId       ON product.Articles(TenantId) INCLUDE (ArticleCode,ArticleName,BrandId,CategoryId,IsActive);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Articles_BrandId'        AND object_id=OBJECT_ID('product.Articles'))   CREATE NONCLUSTERED INDEX IX_Articles_BrandId        ON product.Articles(BrandId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Articles_CategoryId'     AND object_id=OBJECT_ID('product.Articles'))   CREATE NONCLUSTERED INDEX IX_Articles_CategoryId     ON product.Articles(CategoryId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Articles_SegmentId'      AND object_id=OBJECT_ID('product.Articles'))   CREATE NONCLUSTERED INDEX IX_Articles_SegmentId      ON product.Articles(SegmentId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Articles_SeasonId'       AND object_id=OBJECT_ID('product.Articles'))   CREATE NONCLUSTERED INDEX IX_Articles_SeasonId       ON product.Articles(SeasonId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ArticleSizes_ArticleId'  AND object_id=OBJECT_ID('product.ArticleSizes')) CREATE NONCLUSTERED INDEX IX_ArticleSizes_ArticleId ON product.ArticleSizes(ArticleId) INCLUDE (EuroSize,EANCode,MRP);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_StockLedger_WHArticle'   AND object_id=OBJECT_ID('inventory.StockLedger'))   CREATE NONCLUSTERED INDEX IX_StockLedger_WHArticle   ON inventory.StockLedger(WarehouseId,ArticleId) INCLUDE (EuroSize,ClosingStock);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_StockLedger_TenantArt'   AND object_id=OBJECT_ID('inventory.StockLedger'))   CREATE NONCLUSTERED INDEX IX_StockLedger_TenantArt   ON inventory.StockLedger(TenantId,ArticleId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_StockMovements_TenantId' AND object_id=OBJECT_ID('inventory.StockMovements')) CREATE NONCLUSTERED INDEX IX_StockMovements_TenantId ON inventory.StockMovements(TenantId,MovementDate DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_StockMovements_ArtWH'    AND object_id=OBJECT_ID('inventory.StockMovements')) CREATE NONCLUSTERED INDEX IX_StockMovements_ArtWH    ON inventory.StockMovements(ArticleId,WarehouseId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Clients_TenantId'        AND object_id=OBJECT_ID('sales.Clients'))           CREATE NONCLUSTERED INDEX IX_Clients_TenantId        ON sales.Clients(TenantId) WHERE IsActive=1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Stores_ClientId'         AND object_id=OBJECT_ID('sales.Stores'))            CREATE NONCLUSTERED INDEX IX_Stores_ClientId         ON sales.Stores(ClientId) WHERE IsActive=1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Stores_TenantId'         AND object_id=OBJECT_ID('sales.Stores'))            CREATE NONCLUSTERED INDEX IX_Stores_TenantId         ON sales.Stores(TenantId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_CustOrders_TenantId'     AND object_id=OBJECT_ID('sales.CustomerOrders'))    CREATE NONCLUSTERED INDEX IX_CustOrders_TenantId     ON sales.CustomerOrders(TenantId,OrderDate DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_CustOrders_ClientId'     AND object_id=OBJECT_ID('sales.CustomerOrders'))    CREATE NONCLUSTERED INDEX IX_CustOrders_ClientId     ON sales.CustomerOrders(ClientId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_CustOrders_Status'       AND object_id=OBJECT_ID('sales.CustomerOrders'))    CREATE NONCLUSTERED INDEX IX_CustOrders_Status       ON sales.CustomerOrders(Status) INCLUDE (TenantId,OrderDate);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_OrderLines_OrderId'      AND object_id=OBJECT_ID('sales.OrderLines'))        CREATE NONCLUSTERED INDEX IX_OrderLines_OrderId      ON sales.OrderLines(OrderId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ProdOrders_TenantId'     AND object_id=OBJECT_ID('production.ProductionOrders')) CREATE NONCLUSTERED INDEX IX_ProdOrders_TenantId ON production.ProductionOrders(TenantId,OrderDate DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ProdOrders_Status'       AND object_id=OBJECT_ID('production.ProductionOrders')) CREATE NONCLUSTERED INDEX IX_ProdOrders_Status   ON production.ProductionOrders(Status) INCLUDE (TenantId,OrderDate);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Invoices_TenantId'       AND object_id=OBJECT_ID('billing.Invoices'))        CREATE NONCLUSTERED INDEX IX_Invoices_TenantId       ON billing.Invoices(TenantId,InvoiceDate DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Invoices_ClientId'       AND object_id=OBJECT_ID('billing.Invoices'))        CREATE NONCLUSTERED INDEX IX_Invoices_ClientId       ON billing.Invoices(ClientId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Invoices_Status'         AND object_id=OBJECT_ID('billing.Invoices'))        CREATE NONCLUSTERED INDEX IX_Invoices_Status         ON billing.Invoices(Status) INCLUDE (TenantId,InvoiceDate);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_InvoiceLines_InvoiceId'  AND object_id=OBJECT_ID('billing.InvoiceLines'))    CREATE NONCLUSTERED INDEX IX_InvoiceLines_InvoiceId  ON billing.InvoiceLines(InvoiceId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_PackingLists_InvoiceId'  AND object_id=OBJECT_ID('billing.PackingLists'))    CREATE NONCLUSTERED INDEX IX_PackingLists_InvoiceId  ON billing.PackingLists(InvoiceId);
GO
PRINT '>> PART 3: Indexes created.';
GO

-- ====================================================================
-- PART 4 : STORED PROCEDURES  (all menu items)
-- Safe to re-run — uses CREATE OR ALTER
-- ====================================================================
USE RetailERP;
GO
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'reporting') EXEC('CREATE SCHEMA reporting');
GO

-- ── 4.1  BRANDS ──────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE master.sp_Brands_GetAll @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT BrandId, BrandName, IsActive FROM master.Brands WHERE TenantId=@TenantId ORDER BY BrandName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Brands_Create
    @TenantId UNIQUEIDENTIFIER, @BrandName NVARCHAR(200), @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM master.Brands WHERE TenantId=@TenantId AND BrandName=@BrandName)
        THROW 50001,N'Brand already exists.',1;
    INSERT INTO master.Brands(BrandId,TenantId,BrandName,IsActive,CreatedBy,CreatedAt)
    VALUES(NEWID(),@TenantId,@BrandName,1,@CreatedBy,SYSUTCDATETIME());
    SELECT BrandId FROM master.Brands WHERE TenantId=@TenantId AND BrandName=@BrandName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Brands_Update
    @BrandId UNIQUEIDENTIFIER, @BrandName NVARCHAR(200), @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE master.Brands SET BrandName=@BrandName,IsActive=@IsActive,UpdatedAt=SYSUTCDATETIME() WHERE BrandId=@BrandId;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Brands_Delete @BrandId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM product.Articles WHERE BrandId=@BrandId)
        THROW 50002,N'Brand has linked articles.',1;
    UPDATE master.Brands SET IsActive=0 WHERE BrandId=@BrandId;
END
GO

-- ── 4.2  GENDERS ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE master.sp_Genders_GetAll @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT GenderId,GenderName,IsActive FROM master.Genders WHERE TenantId=@TenantId ORDER BY GenderName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Genders_Create
    @TenantId UNIQUEIDENTIFIER, @GenderName NVARCHAR(50), @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM master.Genders WHERE TenantId=@TenantId AND GenderName=@GenderName)
        THROW 50001,N'Gender already exists.',1;
    INSERT INTO master.Genders(GenderId,TenantId,GenderName,IsActive,CreatedBy,CreatedAt)
    VALUES(NEWID(),@TenantId,@GenderName,1,@CreatedBy,SYSUTCDATETIME());
    SELECT GenderId FROM master.Genders WHERE TenantId=@TenantId AND GenderName=@GenderName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Genders_Update
    @GenderId UNIQUEIDENTIFIER, @GenderName NVARCHAR(50), @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE master.Genders SET GenderName=@GenderName,IsActive=@IsActive,UpdatedAt=SYSUTCDATETIME() WHERE GenderId=@GenderId;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Genders_Delete @GenderId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON; UPDATE master.Genders SET IsActive=0 WHERE GenderId=@GenderId; END
GO

-- ── 4.3  SEASONS ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE master.sp_Seasons_GetAll @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT SeasonId,SeasonCode,StartDate,EndDate,IsActive FROM master.Seasons WHERE TenantId=@TenantId ORDER BY StartDate DESC;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Seasons_Create
    @TenantId UNIQUEIDENTIFIER, @SeasonCode NVARCHAR(20), @StartDate DATE, @EndDate DATE, @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM master.Seasons WHERE TenantId=@TenantId AND SeasonCode=@SeasonCode)
        THROW 50001,N'Season code already exists.',1;
    INSERT INTO master.Seasons(SeasonId,TenantId,SeasonCode,StartDate,EndDate,IsActive,CreatedBy,CreatedAt)
    VALUES(NEWID(),@TenantId,@SeasonCode,@StartDate,@EndDate,1,@CreatedBy,SYSUTCDATETIME());
    SELECT SeasonId FROM master.Seasons WHERE TenantId=@TenantId AND SeasonCode=@SeasonCode;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Seasons_Update
    @SeasonId UNIQUEIDENTIFIER, @SeasonCode NVARCHAR(20), @StartDate DATE, @EndDate DATE, @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE master.Seasons SET SeasonCode=@SeasonCode,StartDate=@StartDate,EndDate=@EndDate,
        IsActive=@IsActive,UpdatedAt=SYSUTCDATETIME() WHERE SeasonId=@SeasonId;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Seasons_Delete @SeasonId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON; UPDATE master.Seasons SET IsActive=0 WHERE SeasonId=@SeasonId; END
GO

-- ── 4.4  SEGMENTS & SUB-SEGMENTS ─────────────────────────────────────
CREATE OR ALTER PROCEDURE master.sp_Segments_GetAll @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT s.SegmentId,s.SegmentName,s.IsActive, ss.SubSegmentId,ss.SubSegmentName
    FROM master.Segments s
    LEFT JOIN master.SubSegments ss ON ss.SegmentId=s.SegmentId AND ss.TenantId=@TenantId
    WHERE s.TenantId=@TenantId ORDER BY s.SegmentName,ss.SubSegmentName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Segments_Create
    @TenantId UNIQUEIDENTIFIER, @SegmentName NVARCHAR(200), @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM master.Segments WHERE TenantId=@TenantId AND SegmentName=@SegmentName)
        THROW 50001,N'Segment already exists.',1;
    INSERT INTO master.Segments(SegmentId,TenantId,SegmentName,IsActive,CreatedBy,CreatedAt)
    VALUES(NEWID(),@TenantId,@SegmentName,1,@CreatedBy,SYSUTCDATETIME());
    SELECT SegmentId FROM master.Segments WHERE TenantId=@TenantId AND SegmentName=@SegmentName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Segments_Update
    @SegmentId UNIQUEIDENTIFIER, @SegmentName NVARCHAR(200), @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE master.Segments SET SegmentName=@SegmentName,IsActive=@IsActive,UpdatedAt=SYSUTCDATETIME() WHERE SegmentId=@SegmentId;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Segments_Delete @SegmentId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON; UPDATE master.Segments SET IsActive=0 WHERE SegmentId=@SegmentId; END
GO
CREATE OR ALTER PROCEDURE master.sp_SubSegments_Create
    @TenantId UNIQUEIDENTIFIER, @SegmentId UNIQUEIDENTIFIER, @SubSegmentName NVARCHAR(200), @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM master.SubSegments WHERE SegmentId=@SegmentId AND SubSegmentName=@SubSegmentName)
        THROW 50001,N'SubSegment already exists in this segment.',1;
    INSERT INTO master.SubSegments(SubSegmentId,TenantId,SegmentId,SubSegmentName,IsActive,CreatedBy,CreatedAt)
    VALUES(NEWID(),@TenantId,@SegmentId,@SubSegmentName,1,@CreatedBy,SYSUTCDATETIME());
    SELECT SubSegmentId FROM master.SubSegments WHERE SegmentId=@SegmentId AND SubSegmentName=@SubSegmentName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_SubSegments_Update
    @SubSegmentId UNIQUEIDENTIFIER, @SubSegmentName NVARCHAR(200), @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE master.SubSegments SET SubSegmentName=@SubSegmentName,IsActive=@IsActive,UpdatedAt=SYSUTCDATETIME() WHERE SubSegmentId=@SubSegmentId;
END
GO
CREATE OR ALTER PROCEDURE master.sp_SubSegments_Delete @SubSegmentId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON; UPDATE master.SubSegments SET IsActive=0 WHERE SubSegmentId=@SubSegmentId; END
GO

-- ── 4.5  CATEGORIES & SUB-CATEGORIES ─────────────────────────────────
CREATE OR ALTER PROCEDURE master.sp_Categories_GetAll @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT c.CategoryId,c.CategoryName,c.IsActive, sc.SubCategoryId,sc.SubCategoryName
    FROM master.Categories c
    LEFT JOIN master.SubCategories sc ON sc.CategoryId=c.CategoryId AND sc.TenantId=@TenantId
    WHERE c.TenantId=@TenantId ORDER BY c.CategoryName,sc.SubCategoryName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Categories_Create
    @TenantId UNIQUEIDENTIFIER, @CategoryName NVARCHAR(200), @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM master.Categories WHERE TenantId=@TenantId AND CategoryName=@CategoryName)
        THROW 50001,N'Category already exists.',1;
    INSERT INTO master.Categories(CategoryId,TenantId,CategoryName,IsActive,CreatedBy,CreatedAt)
    VALUES(NEWID(),@TenantId,@CategoryName,1,@CreatedBy,SYSUTCDATETIME());
    SELECT CategoryId FROM master.Categories WHERE TenantId=@TenantId AND CategoryName=@CategoryName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Categories_Update
    @CategoryId UNIQUEIDENTIFIER, @CategoryName NVARCHAR(200), @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE master.Categories SET CategoryName=@CategoryName,IsActive=@IsActive,UpdatedAt=SYSUTCDATETIME() WHERE CategoryId=@CategoryId;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Categories_Delete @CategoryId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON; UPDATE master.Categories SET IsActive=0 WHERE CategoryId=@CategoryId; END
GO
CREATE OR ALTER PROCEDURE master.sp_SubCategories_Create
    @TenantId UNIQUEIDENTIFIER, @CategoryId UNIQUEIDENTIFIER, @SubCategoryName NVARCHAR(200), @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM master.SubCategories WHERE CategoryId=@CategoryId AND SubCategoryName=@SubCategoryName)
        THROW 50001,N'SubCategory already exists.',1;
    INSERT INTO master.SubCategories(SubCategoryId,TenantId,CategoryId,SubCategoryName,IsActive,CreatedBy,CreatedAt)
    VALUES(NEWID(),@TenantId,@CategoryId,@SubCategoryName,1,@CreatedBy,SYSUTCDATETIME());
    SELECT SubCategoryId FROM master.SubCategories WHERE CategoryId=@CategoryId AND SubCategoryName=@SubCategoryName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_SubCategories_Update
    @SubCategoryId UNIQUEIDENTIFIER, @SubCategoryName NVARCHAR(200), @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE master.SubCategories SET SubCategoryName=@SubCategoryName,IsActive=@IsActive,UpdatedAt=SYSUTCDATETIME() WHERE SubCategoryId=@SubCategoryId;
END
GO
CREATE OR ALTER PROCEDURE master.sp_SubCategories_Delete @SubCategoryId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON; UPDATE master.SubCategories SET IsActive=0 WHERE SubCategoryId=@SubCategoryId; END
GO

-- ── 4.6  GROUPS ──────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE master.sp_Groups_GetAll @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT GroupId,GroupName,IsActive FROM master.Groups WHERE TenantId=@TenantId ORDER BY GroupName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Groups_Create
    @TenantId UNIQUEIDENTIFIER, @GroupName NVARCHAR(200), @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM master.Groups WHERE TenantId=@TenantId AND GroupName=@GroupName)
        THROW 50001,N'Group already exists.',1;
    INSERT INTO master.Groups(GroupId,TenantId,GroupName,IsActive,CreatedBy,CreatedAt)
    VALUES(NEWID(),@TenantId,@GroupName,1,@CreatedBy,SYSUTCDATETIME());
    SELECT GroupId FROM master.Groups WHERE TenantId=@TenantId AND GroupName=@GroupName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Groups_Update
    @GroupId UNIQUEIDENTIFIER, @GroupName NVARCHAR(200), @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE master.Groups SET GroupName=@GroupName,IsActive=@IsActive,UpdatedAt=SYSUTCDATETIME() WHERE GroupId=@GroupId;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Groups_Delete @GroupId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON; UPDATE master.Groups SET IsActive=0 WHERE GroupId=@GroupId; END
GO

-- ── 4.7  COLORS ──────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE master.sp_Colors_GetAll @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT ColorId,ColorName,ColorCode,IsActive FROM master.Colors WHERE TenantId=@TenantId ORDER BY ColorName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Colors_Create
    @TenantId UNIQUEIDENTIFIER, @ColorName NVARCHAR(100), @ColorCode NVARCHAR(20)=NULL, @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM master.Colors WHERE TenantId=@TenantId AND ColorName=@ColorName)
        THROW 50001,N'Color already exists.',1;
    INSERT INTO master.Colors(ColorId,TenantId,ColorName,ColorCode,IsActive,CreatedAt)
    VALUES(NEWID(),@TenantId,@ColorName,@ColorCode,1,SYSUTCDATETIME());
    SELECT ColorId FROM master.Colors WHERE TenantId=@TenantId AND ColorName=@ColorName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Colors_Update
    @ColorId UNIQUEIDENTIFIER, @ColorName NVARCHAR(100), @ColorCode NVARCHAR(20)=NULL, @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE master.Colors SET ColorName=@ColorName,ColorCode=@ColorCode,IsActive=@IsActive WHERE ColorId=@ColorId;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Colors_Delete @ColorId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON; UPDATE master.Colors SET IsActive=0 WHERE ColorId=@ColorId; END
GO

-- ── 4.8  STYLES ──────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE master.sp_Styles_GetAll @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT StyleId,StyleName,IsActive FROM master.Styles WHERE TenantId=@TenantId ORDER BY StyleName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Styles_Create
    @TenantId UNIQUEIDENTIFIER, @StyleName NVARCHAR(100), @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    INSERT INTO master.Styles(StyleId,TenantId,StyleName,IsActive,CreatedAt)
    VALUES(NEWID(),@TenantId,@StyleName,1,SYSUTCDATETIME());
    SELECT StyleId FROM master.Styles WHERE TenantId=@TenantId AND StyleName=@StyleName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Styles_Update
    @StyleId UNIQUEIDENTIFIER, @StyleName NVARCHAR(100), @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE master.Styles SET StyleName=@StyleName,IsActive=@IsActive WHERE StyleId=@StyleId;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Styles_Delete @StyleId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON; UPDATE master.Styles SET IsActive=0 WHERE StyleId=@StyleId; END
GO

-- ── 4.9  FASTENERS ───────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE master.sp_Fasteners_GetAll @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT FastenerId,FastenerName,IsActive FROM master.Fasteners WHERE TenantId=@TenantId ORDER BY FastenerName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Fasteners_Create
    @TenantId UNIQUEIDENTIFIER, @FastenerName NVARCHAR(100), @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    INSERT INTO master.Fasteners(FastenerId,TenantId,FastenerName,IsActive,CreatedAt)
    VALUES(NEWID(),@TenantId,@FastenerName,1,SYSUTCDATETIME());
    SELECT FastenerId FROM master.Fasteners WHERE TenantId=@TenantId AND FastenerName=@FastenerName;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Fasteners_Update
    @FastenerId UNIQUEIDENTIFIER, @FastenerName NVARCHAR(100), @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE master.Fasteners SET FastenerName=@FastenerName,IsActive=@IsActive WHERE FastenerId=@FastenerId;
END
GO
CREATE OR ALTER PROCEDURE master.sp_Fasteners_Delete @FastenerId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON; UPDATE master.Fasteners SET IsActive=0 WHERE FastenerId=@FastenerId; END
GO

-- ── 4.10  SIZE CHARTS ────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE master.sp_SizeCharts_GetAll @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT sc.SizeChartId,sc.ChartType,g.GenderName,sc.AgeGroup,
           sc.EuroSize,sc.UKSize,sc.USSize,sc.IndSize,sc.CM,sc.IsActive
    FROM master.SizeCharts sc
    JOIN master.Genders g ON g.GenderId=sc.GenderId
    WHERE sc.TenantId=@TenantId ORDER BY sc.ChartType,g.GenderName,sc.EuroSize;
END
GO
CREATE OR ALTER PROCEDURE master.sp_SizeCharts_Upsert
    @TenantId UNIQUEIDENTIFIER, @ChartType NVARCHAR(50), @GenderId UNIQUEIDENTIFIER,
    @AgeGroup NVARCHAR(50), @EuroSize INT,
    @UKSize DECIMAL(5,1)=NULL, @USSize DECIMAL(5,1)=NULL, @IndSize DECIMAL(5,1)=NULL, @CM DECIMAL(5,1)=NULL
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM master.SizeCharts WHERE TenantId=@TenantId AND ChartType=@ChartType AND GenderId=@GenderId AND EuroSize=@EuroSize)
        UPDATE master.SizeCharts SET UKSize=@UKSize,USSize=@USSize,IndSize=@IndSize,CM=@CM,IsActive=1
        WHERE TenantId=@TenantId AND ChartType=@ChartType AND GenderId=@GenderId AND EuroSize=@EuroSize;
    ELSE
        INSERT INTO master.SizeCharts(SizeChartId,TenantId,ChartType,GenderId,AgeGroup,EuroSize,UKSize,USSize,IndSize,CM,IsActive)
        VALUES(NEWID(),@TenantId,@ChartType,@GenderId,@AgeGroup,@EuroSize,@UKSize,@USSize,@IndSize,@CM,1);
END
GO
CREATE OR ALTER PROCEDURE master.sp_SizeCharts_Delete @SizeChartId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON; DELETE FROM master.SizeCharts WHERE SizeChartId=@SizeChartId; END
GO

-- ── 4.11  HSN CODES ──────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE master.sp_HSNCodes_GetAll AS
BEGIN SET NOCOUNT ON;
    SELECT HSNId,HSNCode,Description,GSTRate FROM master.HSNCodes ORDER BY HSNCode;
END
GO
CREATE OR ALTER PROCEDURE master.sp_HSNCodes_Upsert
    @HSNCode NVARCHAR(20), @Description NVARCHAR(500), @GSTRate DECIMAL(5,2)
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM master.HSNCodes WHERE HSNCode=@HSNCode)
        UPDATE master.HSNCodes SET Description=@Description,GSTRate=@GSTRate WHERE HSNCode=@HSNCode;
    ELSE
        INSERT INTO master.HSNCodes(HSNId,HSNCode,Description,GSTRate) VALUES(NEWID(),@HSNCode,@Description,@GSTRate);
END
GO

-- ── 4.12  ARTICLES ───────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE product.sp_Articles_GetAll
    @TenantId UNIQUEIDENTIFIER, @PageNum INT=1, @PageSize INT=50,
    @Search NVARCHAR(100)=NULL, @BrandId UNIQUEIDENTIFIER=NULL, @IsActive BIT=NULL
AS BEGIN SET NOCOUNT ON;
    SELECT a.ArticleId,a.ArticleCode,a.ArticleName,b.BrandName,g.GenderName,
           a.Color,a.HSNCode,a.MRP,a.IsActive, COUNT(*) OVER() AS TotalCount
    FROM product.Articles a
    LEFT JOIN master.Brands  b ON b.BrandId =a.BrandId
    LEFT JOIN master.Genders g ON g.GenderId=a.GenderId
    WHERE a.TenantId=@TenantId
      AND (@IsActive IS NULL OR a.IsActive=@IsActive)
      AND (@BrandId  IS NULL OR a.BrandId =@BrandId)
      AND (@Search   IS NULL OR a.ArticleCode LIKE '%'+@Search+'%' OR a.ArticleName LIKE '%'+@Search+'%')
    ORDER BY a.ArticleName
    OFFSET (@PageNum-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO
CREATE OR ALTER PROCEDURE product.sp_Articles_GetById @ArticleId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT a.*,b.BrandName,g.GenderName,sg.SegmentName,sg2.SubSegmentName,
           cat.CategoryName,sc.SubCategoryName,gr.GroupName
    FROM product.Articles a
    LEFT JOIN master.Brands        b   ON b.BrandId        =a.BrandId
    LEFT JOIN master.Genders       g   ON g.GenderId       =a.GenderId
    LEFT JOIN master.Segments      sg  ON sg.SegmentId     =a.SegmentId
    LEFT JOIN master.SubSegments   sg2 ON sg2.SubSegmentId =a.SubSegmentId
    LEFT JOIN master.Categories    cat ON cat.CategoryId   =a.CategoryId
    LEFT JOIN master.SubCategories sc  ON sc.SubCategoryId =a.SubCategoryId
    LEFT JOIN master.Groups        gr  ON gr.GroupId       =a.GroupId
    WHERE a.ArticleId=@ArticleId;
    SELECT ArticleSizeId,EuroSize,UKSize,USSize,EANCode,MRP,IsActive
    FROM product.ArticleSizes WHERE ArticleId=@ArticleId ORDER BY EuroSize;
    SELECT ImageId,ImageUrl,IsPrimary,DisplayOrder FROM product.ArticleImages WHERE ArticleId=@ArticleId;
END
GO
CREATE OR ALTER PROCEDURE product.sp_Articles_Create
    @TenantId UNIQUEIDENTIFIER, @ArticleCode NVARCHAR(50), @ArticleName NVARCHAR(300),
    @BrandId UNIQUEIDENTIFIER, @SegmentId UNIQUEIDENTIFIER, @SubSegmentId UNIQUEIDENTIFIER=NULL,
    @CategoryId UNIQUEIDENTIFIER, @SubCategoryId UNIQUEIDENTIFIER=NULL, @GroupId UNIQUEIDENTIFIER=NULL,
    @SeasonId UNIQUEIDENTIFIER=NULL, @GenderId UNIQUEIDENTIFIER, @ColorId UNIQUEIDENTIFIER=NULL,
    @Color NVARCHAR(100), @Style NVARCHAR(100)=NULL, @Fastener NVARCHAR(100)=NULL,
    @HSNCode NVARCHAR(20), @MRP DECIMAL(12,2)=0, @CBD DECIMAL(12,2)=0, @IsSizeBased BIT=1,
    @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM product.Articles WHERE TenantId=@TenantId AND ArticleCode=@ArticleCode)
        THROW 50001,N'Article code already exists.',1;
    DECLARE @Id UNIQUEIDENTIFIER=NEWID();
    INSERT INTO product.Articles(ArticleId,TenantId,ArticleCode,ArticleName,BrandId,SegmentId,
        SubSegmentId,CategoryId,SubCategoryId,GroupId,SeasonId,GenderId,ColorId,Color,Style,
        Fastener,HSNCode,UOM,MRP,CBD,IsSizeBased,IsActive,CreatedBy,CreatedAt)
    VALUES(@Id,@TenantId,@ArticleCode,@ArticleName,@BrandId,@SegmentId,
        @SubSegmentId,@CategoryId,@SubCategoryId,@GroupId,@SeasonId,@GenderId,@ColorId,@Color,@Style,
        @Fastener,@HSNCode,'PAIRS',@MRP,@CBD,@IsSizeBased,1,@CreatedBy,SYSUTCDATETIME());
    SELECT @Id AS ArticleId;
END
GO
CREATE OR ALTER PROCEDURE product.sp_Articles_Update
    @ArticleId UNIQUEIDENTIFIER, @ArticleCode NVARCHAR(50), @ArticleName NVARCHAR(300),
    @BrandId UNIQUEIDENTIFIER, @SegmentId UNIQUEIDENTIFIER, @SubSegmentId UNIQUEIDENTIFIER=NULL,
    @CategoryId UNIQUEIDENTIFIER, @SubCategoryId UNIQUEIDENTIFIER=NULL, @GroupId UNIQUEIDENTIFIER=NULL,
    @SeasonId UNIQUEIDENTIFIER=NULL, @GenderId UNIQUEIDENTIFIER, @ColorId UNIQUEIDENTIFIER=NULL,
    @Color NVARCHAR(100), @Style NVARCHAR(100)=NULL, @Fastener NVARCHAR(100)=NULL,
    @HSNCode NVARCHAR(20), @MRP DECIMAL(12,2)=0, @CBD DECIMAL(12,2)=0, @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE product.Articles SET ArticleCode=@ArticleCode,ArticleName=@ArticleName,
        BrandId=@BrandId,SegmentId=@SegmentId,SubSegmentId=@SubSegmentId,
        CategoryId=@CategoryId,SubCategoryId=@SubCategoryId,GroupId=@GroupId,
        SeasonId=@SeasonId,GenderId=@GenderId,ColorId=@ColorId,Color=@Color,
        Style=@Style,Fastener=@Fastener,HSNCode=@HSNCode,MRP=@MRP,CBD=@CBD,
        IsActive=@IsActive,UpdatedAt=SYSUTCDATETIME()
    WHERE ArticleId=@ArticleId;
END
GO
CREATE OR ALTER PROCEDURE product.sp_Articles_Delete @ArticleId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inventory.StockLedger WHERE ArticleId=@ArticleId AND ClosingStock>0)
        THROW 50003,N'Cannot delete article with non-zero stock.',1;
    UPDATE product.Articles SET IsActive=0 WHERE ArticleId=@ArticleId;
END
GO
CREATE OR ALTER PROCEDURE product.sp_Articles_AddSize
    @ArticleId UNIQUEIDENTIFIER, @EuroSize INT, @UKSize DECIMAL(5,1)=NULL,
    @USSize DECIMAL(5,1)=NULL, @EANCode NVARCHAR(20)=NULL, @MRP DECIMAL(12,2)=NULL
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM product.ArticleSizes WHERE ArticleId=@ArticleId AND EuroSize=@EuroSize)
        THROW 50001,N'Size already exists.',1;
    INSERT INTO product.ArticleSizes(ArticleSizeId,ArticleId,EuroSize,UKSize,USSize,EANCode,MRP,IsActive)
    VALUES(NEWID(),@ArticleId,@EuroSize,@UKSize,@USSize,@EANCode,@MRP,1);
END
GO

-- ── 4.13  WAREHOUSES ─────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE warehouse.sp_Warehouses_GetAll @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT WarehouseId,WarehouseCode,WarehouseName,Address,City,State,IsActive
    FROM warehouse.Warehouses WHERE TenantId=@TenantId ORDER BY WarehouseName;
END
GO
CREATE OR ALTER PROCEDURE warehouse.sp_Warehouses_GetById @WarehouseId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON; SELECT * FROM warehouse.Warehouses WHERE WarehouseId=@WarehouseId; END
GO
CREATE OR ALTER PROCEDURE warehouse.sp_Warehouses_Create
    @TenantId UNIQUEIDENTIFIER, @WarehouseCode NVARCHAR(50), @WarehouseName NVARCHAR(300),
    @Address NVARCHAR(500)=NULL, @City NVARCHAR(100)=NULL, @State NVARCHAR(100)=NULL,
    @PinCode NVARCHAR(10)=NULL, @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM warehouse.Warehouses WHERE TenantId=@TenantId AND WarehouseCode=@WarehouseCode)
        THROW 50001,N'Warehouse code already exists.',1;
    DECLARE @Id UNIQUEIDENTIFIER=NEWID();
    INSERT INTO warehouse.Warehouses(WarehouseId,TenantId,WarehouseCode,WarehouseName,Address,City,State,PinCode,IsActive,CreatedBy,CreatedAt)
    VALUES(@Id,@TenantId,@WarehouseCode,@WarehouseName,@Address,@City,@State,@PinCode,1,@CreatedBy,SYSUTCDATETIME());
    SELECT @Id AS WarehouseId;
END
GO
CREATE OR ALTER PROCEDURE warehouse.sp_Warehouses_Update
    @WarehouseId UNIQUEIDENTIFIER, @WarehouseCode NVARCHAR(50), @WarehouseName NVARCHAR(300),
    @Address NVARCHAR(500)=NULL, @City NVARCHAR(100)=NULL, @State NVARCHAR(100)=NULL,
    @PinCode NVARCHAR(10)=NULL, @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE warehouse.Warehouses SET WarehouseCode=@WarehouseCode,WarehouseName=@WarehouseName,
        Address=@Address,City=@City,State=@State,PinCode=@PinCode,IsActive=@IsActive,UpdatedAt=SYSUTCDATETIME()
    WHERE WarehouseId=@WarehouseId;
END
GO
CREATE OR ALTER PROCEDURE warehouse.sp_Warehouses_Delete @WarehouseId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inventory.StockLedger WHERE WarehouseId=@WarehouseId)
        THROW 50003,N'Cannot delete warehouse with stock records.',1;
    UPDATE warehouse.Warehouses SET IsActive=0 WHERE WarehouseId=@WarehouseId;
END
GO

-- ── 4.14  CLIENTS ────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sales.sp_Clients_GetAll
    @TenantId UNIQUEIDENTIFIER, @Search NVARCHAR(100)=NULL, @IsActive BIT=NULL
AS BEGIN SET NOCOUNT ON;
    SELECT ClientId,ClientCode,ClientName,Organisation,GSTIN,Email,ContactNo,StateCode,Zone,IsActive
    FROM sales.Clients WHERE TenantId=@TenantId
      AND (@IsActive IS NULL OR IsActive=@IsActive)
      AND (@Search IS NULL OR ClientCode LIKE '%'+@Search+'%' OR ClientName LIKE '%'+@Search+'%')
    ORDER BY ClientName;
END
GO
CREATE OR ALTER PROCEDURE sales.sp_Clients_GetById @ClientId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT c.*,st.StateName FROM sales.Clients c
    LEFT JOIN master.States st ON st.StateId=c.StateId
    WHERE c.ClientId=@ClientId;
    SELECT StoreId,StoreCode,StoreName,City,State,IsActive FROM sales.Stores WHERE ClientId=@ClientId AND IsActive=1;
END
GO
CREATE OR ALTER PROCEDURE sales.sp_Clients_Create
    @TenantId UNIQUEIDENTIFIER, @ClientCode NVARCHAR(50), @ClientName NVARCHAR(300),
    @Organisation NVARCHAR(300)=NULL, @GSTIN NVARCHAR(15)=NULL, @PAN NVARCHAR(10)=NULL,
    @StateId INT=NULL, @StateCode NVARCHAR(5)=NULL, @Zone NVARCHAR(20)=NULL,
    @Email NVARCHAR(200)=NULL, @ContactNo NVARCHAR(20)=NULL,
    @MarginPercent DECIMAL(5,2)=0, @MarginType NVARCHAR(20)='NET OF TAXES',
    @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM sales.Clients WHERE TenantId=@TenantId AND ClientCode=@ClientCode)
        THROW 50001,N'Client code already exists.',1;
    DECLARE @Id UNIQUEIDENTIFIER=NEWID();
    INSERT INTO sales.Clients(ClientId,TenantId,ClientCode,ClientName,Organisation,GSTIN,PAN,
        StateId,StateCode,Zone,Email,ContactNo,MarginPercent,MarginType,IsActive,CreatedBy,CreatedAt)
    VALUES(@Id,@TenantId,@ClientCode,@ClientName,@Organisation,@GSTIN,@PAN,
        @StateId,@StateCode,@Zone,@Email,@ContactNo,@MarginPercent,@MarginType,1,@CreatedBy,SYSUTCDATETIME());
    SELECT @Id AS ClientId;
END
GO
CREATE OR ALTER PROCEDURE sales.sp_Clients_Update
    @ClientId UNIQUEIDENTIFIER, @ClientCode NVARCHAR(50), @ClientName NVARCHAR(300),
    @Organisation NVARCHAR(300)=NULL, @GSTIN NVARCHAR(15)=NULL, @PAN NVARCHAR(10)=NULL,
    @StateId INT=NULL, @StateCode NVARCHAR(5)=NULL, @Zone NVARCHAR(20)=NULL,
    @Email NVARCHAR(200)=NULL, @ContactNo NVARCHAR(20)=NULL,
    @MarginPercent DECIMAL(5,2)=0, @MarginType NVARCHAR(20)='NET OF TAXES', @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE sales.Clients SET ClientCode=@ClientCode,ClientName=@ClientName,Organisation=@Organisation,
        GSTIN=@GSTIN,PAN=@PAN,StateId=@StateId,StateCode=@StateCode,Zone=@Zone,
        Email=@Email,ContactNo=@ContactNo,MarginPercent=@MarginPercent,MarginType=@MarginType,
        IsActive=@IsActive,UpdatedAt=SYSUTCDATETIME()
    WHERE ClientId=@ClientId;
END
GO
CREATE OR ALTER PROCEDURE sales.sp_Clients_Delete @ClientId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM sales.CustomerOrders WHERE ClientId=@ClientId)
        THROW 50003,N'Cannot delete client with linked orders.',1;
    UPDATE sales.Clients SET IsActive=0 WHERE ClientId=@ClientId;
END
GO

-- ── 4.15  STORES ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sales.sp_Stores_GetAll
    @TenantId UNIQUEIDENTIFIER, @ClientId UNIQUEIDENTIFIER=NULL
AS BEGIN SET NOCOUNT ON;
    SELECT s.StoreId,s.StoreCode,s.StoreName,s.City,s.State,s.Channel,s.GSTIN,s.IsActive,c.ClientName
    FROM sales.Stores s JOIN sales.Clients c ON c.ClientId=s.ClientId
    WHERE s.TenantId=@TenantId AND (@ClientId IS NULL OR s.ClientId=@ClientId)
    ORDER BY c.ClientName,s.StoreName;
END
GO
CREATE OR ALTER PROCEDURE sales.sp_Stores_GetById @StoreId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT s.*,c.ClientName,c.ClientCode FROM sales.Stores s
    JOIN sales.Clients c ON c.ClientId=s.ClientId WHERE s.StoreId=@StoreId;
END
GO
CREATE OR ALTER PROCEDURE sales.sp_Stores_Create
    @TenantId UNIQUEIDENTIFIER, @ClientId UNIQUEIDENTIFIER, @StoreCode NVARCHAR(50),
    @StoreName NVARCHAR(300), @Format NVARCHAR(50)=NULL, @Organisation NVARCHAR(300)=NULL,
    @City NVARCHAR(100)=NULL, @State NVARCHAR(100)=NULL, @Channel NVARCHAR(50)=NULL,
    @ModusOperandi NVARCHAR(10)=NULL, @ManagerName NVARCHAR(200)=NULL, @Email NVARCHAR(200)=NULL,
    @GSTIN NVARCHAR(15)=NULL, @PAN NVARCHAR(10)=NULL,
    @MarginPercent DECIMAL(5,2)=0, @MarginType NVARCHAR(20)='NET OF TAXES',
    @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM sales.Stores WHERE TenantId=@TenantId AND StoreCode=@StoreCode)
        THROW 50001,N'Store code already exists.',1;
    DECLARE @Id UNIQUEIDENTIFIER=NEWID();
    INSERT INTO sales.Stores(StoreId,TenantId,ClientId,StoreCode,StoreName,Format,Organisation,
        City,State,Channel,ModusOperandi,MarginPercent,MarginType,ManagerName,Email,GSTIN,PAN,
        IsActive,CreatedBy,CreatedAt)
    VALUES(@Id,@TenantId,@ClientId,@StoreCode,@StoreName,@Format,@Organisation,
        @City,@State,@Channel,@ModusOperandi,@MarginPercent,@MarginType,@ManagerName,@Email,@GSTIN,@PAN,
        1,@CreatedBy,SYSUTCDATETIME());
    SELECT @Id AS StoreId;
END
GO
CREATE OR ALTER PROCEDURE sales.sp_Stores_Update
    @StoreId UNIQUEIDENTIFIER, @StoreCode NVARCHAR(50), @StoreName NVARCHAR(300),
    @Format NVARCHAR(50)=NULL, @Organisation NVARCHAR(300)=NULL,
    @City NVARCHAR(100)=NULL, @State NVARCHAR(100)=NULL, @Channel NVARCHAR(50)=NULL,
    @ModusOperandi NVARCHAR(10)=NULL, @ManagerName NVARCHAR(200)=NULL, @Email NVARCHAR(200)=NULL,
    @GSTIN NVARCHAR(15)=NULL, @PAN NVARCHAR(10)=NULL,
    @MarginPercent DECIMAL(5,2)=0, @MarginType NVARCHAR(20)='NET OF TAXES', @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE sales.Stores SET StoreCode=@StoreCode,StoreName=@StoreName,Format=@Format,
        Organisation=@Organisation,City=@City,State=@State,Channel=@Channel,
        ModusOperandi=@ModusOperandi,ManagerName=@ManagerName,Email=@Email,GSTIN=@GSTIN,PAN=@PAN,
        MarginPercent=@MarginPercent,MarginType=@MarginType,IsActive=@IsActive,UpdatedAt=SYSUTCDATETIME()
    WHERE StoreId=@StoreId;
END
GO
CREATE OR ALTER PROCEDURE sales.sp_Stores_Delete @StoreId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON; UPDATE sales.Stores SET IsActive=0 WHERE StoreId=@StoreId; END
GO

-- ── 4.16  STOCK ──────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE inventory.sp_Stock_GetByWarehouse
    @TenantId UNIQUEIDENTIFIER, @WarehouseId UNIQUEIDENTIFIER, @Search NVARCHAR(100)=NULL
AS BEGIN SET NOCOUNT ON;
    SELECT sl.StockLedgerId,sl.ArticleId,a.ArticleCode,a.ArticleName,
           sl.EuroSize,sl.OpeningStock,sl.InwardQty,sl.OutwardQty,sl.ClosingStock
    FROM inventory.StockLedger sl JOIN product.Articles a ON a.ArticleId=sl.ArticleId
    WHERE sl.TenantId=@TenantId AND sl.WarehouseId=@WarehouseId
      AND (@Search IS NULL OR a.ArticleCode LIKE '%'+@Search+'%' OR a.ArticleName LIKE '%'+@Search+'%')
    ORDER BY a.ArticleName,sl.EuroSize;
END
GO
CREATE OR ALTER PROCEDURE inventory.sp_Stock_Overview @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT a.ArticleId,a.ArticleCode,a.ArticleName,
           SUM(sl.ClosingStock) AS TotalStock, COUNT(DISTINCT sl.WarehouseId) AS WarehouseCount
    FROM inventory.StockLedger sl JOIN product.Articles a ON a.ArticleId=sl.ArticleId
    WHERE sl.TenantId=@TenantId
    GROUP BY a.ArticleId,a.ArticleCode,a.ArticleName ORDER BY TotalStock;
END
GO
CREATE OR ALTER PROCEDURE inventory.sp_Stock_CheckAvailability
    @TenantId UNIQUEIDENTIFIER, @ArticleId UNIQUEIDENTIFIER,
    @WarehouseId UNIQUEIDENTIFIER=NULL, @EuroSize INT=NULL
AS BEGIN SET NOCOUNT ON;
    SELECT sl.WarehouseId,w.WarehouseName,sl.EuroSize,sl.ClosingStock AS AvailableQty
    FROM inventory.StockLedger sl JOIN warehouse.Warehouses w ON w.WarehouseId=sl.WarehouseId
    WHERE sl.TenantId=@TenantId AND sl.ArticleId=@ArticleId
      AND (@WarehouseId IS NULL OR sl.WarehouseId=@WarehouseId)
      AND (@EuroSize IS NULL OR sl.EuroSize=@EuroSize)
      AND sl.ClosingStock>0
    ORDER BY w.WarehouseName,sl.EuroSize;
END
GO
CREATE OR ALTER PROCEDURE inventory.sp_Stock_RecordMovement
    @TenantId UNIQUEIDENTIFIER, @WarehouseId UNIQUEIDENTIFIER, @ArticleId UNIQUEIDENTIFIER,
    @EuroSize INT, @Direction NVARCHAR(10), @MovementType NVARCHAR(30), @Quantity INT,
    @ReferenceType NVARCHAR(50)=NULL, @ReferenceId UNIQUEIDENTIFIER=NULL,
    @Notes NVARCHAR(500)=NULL, @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    BEGIN TRANSACTION;
    MERGE inventory.StockLedger AS tgt
    USING (SELECT @TenantId T,@WarehouseId W,@ArticleId A,@EuroSize E) AS src(T,W,A,E)
    ON tgt.TenantId=src.T AND tgt.WarehouseId=src.W AND tgt.ArticleId=src.A AND tgt.EuroSize=src.E
    WHEN MATCHED THEN UPDATE SET
        InwardQty  = CASE WHEN @Direction='INWARD'  THEN tgt.InwardQty+@Quantity  ELSE tgt.InwardQty  END,
        OutwardQty = CASE WHEN @Direction='OUTWARD' THEN tgt.OutwardQty+@Quantity ELSE tgt.OutwardQty END,
        LastUpdated=SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
        INSERT(StockLedgerId,TenantId,WarehouseId,ArticleId,EuroSize,OpeningStock,InwardQty,OutwardQty,LastUpdated)
        VALUES(NEWID(),@TenantId,@WarehouseId,@ArticleId,@EuroSize,0,
               CASE WHEN @Direction='INWARD'  THEN @Quantity ELSE 0 END,
               CASE WHEN @Direction='OUTWARD' THEN @Quantity ELSE 0 END,
               SYSUTCDATETIME());
    INSERT INTO inventory.StockMovements(MovementId,TenantId,WarehouseId,ArticleId,EuroSize,
        MovementType,Direction,Quantity,ReferenceType,ReferenceId,Notes,CreatedBy,MovementDate)
    VALUES(NEWID(),@TenantId,@WarehouseId,@ArticleId,@EuroSize,
        @MovementType,@Direction,@Quantity,@ReferenceType,@ReferenceId,@Notes,@CreatedBy,SYSUTCDATETIME());
    COMMIT;
END
GO

-- ── 4.17  GRN / RECEIPT ──────────────────────────────────────────────
CREATE OR ALTER PROCEDURE inventory.sp_GRN_GetAll
    @TenantId UNIQUEIDENTIFIER, @Status NVARCHAR(20)=NULL
AS BEGIN SET NOCOUNT ON;
    SELECT g.GRNId,g.GRNNumber,g.ReceiptDate,g.Status,g.SourceType,g.TotalQuantity,g.WarehouseId,w.WarehouseName
    FROM inventory.GoodsReceivedNotes g JOIN warehouse.Warehouses w ON w.WarehouseId=g.WarehouseId
    WHERE g.TenantId=@TenantId AND (@Status IS NULL OR g.Status=@Status)
    ORDER BY g.ReceiptDate DESC;
END
GO
CREATE OR ALTER PROCEDURE inventory.sp_GRN_GetById @GRNId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT g.*,w.WarehouseName FROM inventory.GoodsReceivedNotes g
    JOIN warehouse.Warehouses w ON w.WarehouseId=g.WarehouseId WHERE g.GRNId=@GRNId;
    SELECT gl.GRNLineId,gl.ArticleId,a.ArticleCode,a.ArticleName,gl.EuroSize,gl.Quantity
    FROM inventory.GRNLines gl JOIN product.Articles a ON a.ArticleId=gl.ArticleId
    WHERE gl.GRNId=@GRNId ORDER BY a.ArticleName,gl.EuroSize;
END
GO
CREATE OR ALTER PROCEDURE inventory.sp_GRN_Create
    @TenantId UNIQUEIDENTIFIER, @GRNNumber NVARCHAR(50), @WarehouseId UNIQUEIDENTIFIER,
    @ReceiptDate DATE, @SourceType NVARCHAR(20)='Purchase', @ReferenceNo NVARCHAR(100)=NULL,
    @Notes NVARCHAR(500)=NULL, @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inventory.GoodsReceivedNotes WHERE TenantId=@TenantId AND GRNNumber=@GRNNumber)
        THROW 50001,N'GRN number already exists.',1;
    DECLARE @Id UNIQUEIDENTIFIER=NEWID();
    INSERT INTO inventory.GoodsReceivedNotes(GRNId,TenantId,GRNNumber,WarehouseId,ReceiptDate,
        SourceType,ReferenceNo,Status,TotalQuantity,Notes,CreatedBy,CreatedAt)
    VALUES(@Id,@TenantId,@GRNNumber,@WarehouseId,@ReceiptDate,
        @SourceType,@ReferenceNo,'Draft',0,@Notes,@CreatedBy,SYSUTCDATETIME());
    SELECT @Id AS GRNId;
END
GO
CREATE OR ALTER PROCEDURE inventory.sp_GRN_AddLine
    @GRNId UNIQUEIDENTIFIER, @ArticleId UNIQUEIDENTIFIER, @EuroSize INT, @Quantity INT
AS BEGIN SET NOCOUNT ON;
    INSERT INTO inventory.GRNLines(GRNLineId,GRNId,ArticleId,EuroSize,Quantity)
    VALUES(NEWID(),@GRNId,@ArticleId,@EuroSize,@Quantity);
    UPDATE inventory.GoodsReceivedNotes
    SET TotalQuantity=(SELECT ISNULL(SUM(Quantity),0) FROM inventory.GRNLines WHERE GRNId=@GRNId)
    WHERE GRNId=@GRNId;
END
GO
CREATE OR ALTER PROCEDURE inventory.sp_GRN_Confirm @GRNId UNIQUEIDENTIFIER, @ConfirmedBy UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    DECLARE @TenantId UNIQUEIDENTIFIER, @WarehouseId UNIQUEIDENTIFIER, @Status NVARCHAR(20);
    SELECT @TenantId=TenantId,@WarehouseId=WarehouseId,@Status=Status
    FROM inventory.GoodsReceivedNotes WHERE GRNId=@GRNId;
    IF @Status != 'Draft' THROW 50004,N'GRN already confirmed.',1;
    BEGIN TRANSACTION;
    DECLARE @ArtId UNIQUEIDENTIFIER, @EuroSz INT, @Qty INT;
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
        SELECT ArticleId,EuroSize,Quantity FROM inventory.GRNLines WHERE GRNId=@GRNId;
    OPEN cur; FETCH NEXT FROM cur INTO @ArtId,@EuroSz,@Qty;
    WHILE @@FETCH_STATUS=0 BEGIN
        EXEC inventory.sp_Stock_RecordMovement @TenantId,@WarehouseId,@ArtId,@EuroSz,'INWARD','PURCHASE',@Qty,'GRN',@GRNId,NULL,@ConfirmedBy;
        FETCH NEXT FROM cur INTO @ArtId,@EuroSz,@Qty;
    END
    CLOSE cur; DEALLOCATE cur;
    UPDATE inventory.GoodsReceivedNotes SET Status='Confirmed',UpdatedAt=SYSUTCDATETIME() WHERE GRNId=@GRNId;
    COMMIT;
END
GO

-- ── 4.18  PRODUCTION ORDERS ──────────────────────────────────────────
CREATE OR ALTER PROCEDURE production.sp_Production_GetAll
    @TenantId UNIQUEIDENTIFIER, @Status NVARCHAR(30)=NULL
AS BEGIN SET NOCOUNT ON;
    SELECT p.ProductionOrderId,p.OrderNo,p.OrderDate,p.Status,
           p.ArticleId,a.ArticleName,a.ArticleCode,p.Color,p.TotalQuantity,p.OrderType
    FROM production.ProductionOrders p JOIN product.Articles a ON a.ArticleId=p.ArticleId
    WHERE p.TenantId=@TenantId AND (@Status IS NULL OR p.Status=@Status)
    ORDER BY p.OrderDate DESC;
END
GO
CREATE OR ALTER PROCEDURE production.sp_Production_GetById @ProductionOrderId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT p.*,a.ArticleName,a.ArticleCode FROM production.ProductionOrders p
    JOIN product.Articles a ON a.ArticleId=p.ArticleId WHERE p.ProductionOrderId=@ProductionOrderId;
    SELECT SizeRunId,EuroSize,Quantity,ProducedQty FROM production.ProductionSizeRuns
    WHERE ProductionOrderId=@ProductionOrderId ORDER BY EuroSize;
END
GO
CREATE OR ALTER PROCEDURE production.sp_Production_Create
    @TenantId UNIQUEIDENTIFIER, @OrderNo NVARCHAR(50), @ArticleId UNIQUEIDENTIFIER,
    @OrderDate DATE, @Color NVARCHAR(100), @OrderType NVARCHAR(50)='REPLENISHMENT',
    @Notes NVARCHAR(1000)=NULL, @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM production.ProductionOrders WHERE TenantId=@TenantId AND OrderNo=@OrderNo)
        THROW 50001,N'Production order number already exists.',1;
    DECLARE @Id UNIQUEIDENTIFIER=NEWID();
    INSERT INTO production.ProductionOrders(ProductionOrderId,TenantId,OrderNo,ArticleId,
        OrderDate,Color,OrderType,TotalQuantity,Status,Notes,CreatedBy,CreatedAt)
    VALUES(@Id,@TenantId,@OrderNo,@ArticleId,@OrderDate,@Color,@OrderType,0,'DRAFT',@Notes,@CreatedBy,SYSUTCDATETIME());
    SELECT @Id AS ProductionOrderId;
END
GO
CREATE OR ALTER PROCEDURE production.sp_Production_AddSizeRun
    @ProductionOrderId UNIQUEIDENTIFIER, @EuroSize INT, @Quantity INT
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM production.ProductionSizeRuns WHERE ProductionOrderId=@ProductionOrderId AND EuroSize=@EuroSize)
        UPDATE production.ProductionSizeRuns SET Quantity=@Quantity WHERE ProductionOrderId=@ProductionOrderId AND EuroSize=@EuroSize;
    ELSE
        INSERT INTO production.ProductionSizeRuns(SizeRunId,ProductionOrderId,EuroSize,Quantity,ProducedQty)
        VALUES(NEWID(),@ProductionOrderId,@EuroSize,@Quantity,0);
    UPDATE production.ProductionOrders
    SET TotalQuantity=(SELECT ISNULL(SUM(Quantity),0) FROM production.ProductionSizeRuns WHERE ProductionOrderId=@ProductionOrderId)
    WHERE ProductionOrderId=@ProductionOrderId;
END
GO
CREATE OR ALTER PROCEDURE production.sp_Production_UpdateStatus
    @ProductionOrderId UNIQUEIDENTIFIER, @Status NVARCHAR(30), @UpdatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    UPDATE production.ProductionOrders SET Status=@Status,UpdatedAt=SYSUTCDATETIME(),
        ApprovedBy  = CASE WHEN @Status='APPROVED'  THEN @UpdatedBy       ELSE ApprovedBy  END,
        ApprovedAt  = CASE WHEN @Status='APPROVED'  THEN SYSUTCDATETIME() ELSE ApprovedAt  END,
        CompletedAt = CASE WHEN @Status='COMPLETED' THEN SYSUTCDATETIME() ELSE CompletedAt END
    WHERE ProductionOrderId=@ProductionOrderId;
END
GO

-- ── 4.19  CUSTOMER ORDERS ────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sales.sp_Orders_GetAll
    @TenantId UNIQUEIDENTIFIER, @Status NVARCHAR(30)=NULL, @ClientId UNIQUEIDENTIFIER=NULL
AS BEGIN SET NOCOUNT ON;
    SELECT o.OrderId,o.OrderNo,o.OrderDate,o.Status,c.ClientName,s.StoreName,o.TotalQuantity,o.TotalAmount
    FROM sales.CustomerOrders o JOIN sales.Clients c ON c.ClientId=o.ClientId
    LEFT JOIN sales.Stores s ON s.StoreId=o.StoreId
    WHERE o.TenantId=@TenantId
      AND (@Status IS NULL OR o.Status=@Status)
      AND (@ClientId IS NULL OR o.ClientId=@ClientId)
    ORDER BY o.OrderDate DESC;
END
GO
CREATE OR ALTER PROCEDURE sales.sp_Orders_GetById @OrderId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT o.*,c.ClientName,c.GSTIN,s.StoreName FROM sales.CustomerOrders o
    JOIN sales.Clients c ON c.ClientId=o.ClientId LEFT JOIN sales.Stores s ON s.StoreId=o.StoreId
    WHERE o.OrderId=@OrderId;
    SELECT ol.OrderLineId,ol.ArticleId,a.ArticleCode,a.ArticleName,ol.Color,ol.EuroSize,ol.HSNCode,ol.MRP,ol.Quantity,ol.LineTotal
    FROM sales.OrderLines ol JOIN product.Articles a ON a.ArticleId=ol.ArticleId
    WHERE ol.OrderId=@OrderId ORDER BY a.ArticleName,ol.EuroSize;
END
GO
CREATE OR ALTER PROCEDURE sales.sp_Orders_Create
    @TenantId UNIQUEIDENTIFIER, @OrderNo NVARCHAR(50), @ClientId UNIQUEIDENTIFIER,
    @StoreId UNIQUEIDENTIFIER, @OrderDate DATE, @WarehouseId UNIQUEIDENTIFIER=NULL,
    @Notes NVARCHAR(1000)=NULL, @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM sales.CustomerOrders WHERE TenantId=@TenantId AND OrderNo=@OrderNo)
        THROW 50001,N'Order number already exists.',1;
    DECLARE @Id UNIQUEIDENTIFIER=NEWID();
    INSERT INTO sales.CustomerOrders(OrderId,TenantId,OrderNo,ClientId,StoreId,WarehouseId,
        OrderDate,TotalQuantity,TotalMRP,TotalAmount,Status,Notes,CreatedBy,CreatedAt)
    VALUES(@Id,@TenantId,@OrderNo,@ClientId,@StoreId,@WarehouseId,
        @OrderDate,0,0,0,'DRAFT',@Notes,@CreatedBy,SYSUTCDATETIME());
    SELECT @Id AS OrderId;
END
GO
CREATE OR ALTER PROCEDURE sales.sp_Orders_AddLine
    @OrderId UNIQUEIDENTIFIER, @ArticleId UNIQUEIDENTIFIER, @Color NVARCHAR(100),
    @EuroSize INT, @HSNCode NVARCHAR(20), @MRP DECIMAL(12,2), @Quantity INT
AS BEGIN SET NOCOUNT ON;
    INSERT INTO sales.OrderLines(OrderLineId,OrderId,ArticleId,Color,EuroSize,HSNCode,MRP,Quantity,LineTotal)
    VALUES(NEWID(),@OrderId,@ArticleId,@Color,@EuroSize,@HSNCode,@MRP,@Quantity,@Quantity*@MRP);
    UPDATE sales.CustomerOrders
    SET TotalQuantity=(SELECT ISNULL(SUM(Quantity),0) FROM sales.OrderLines WHERE OrderId=@OrderId),
        TotalMRP=(SELECT ISNULL(SUM(LineTotal),0) FROM sales.OrderLines WHERE OrderId=@OrderId)
    WHERE OrderId=@OrderId;
END
GO
CREATE OR ALTER PROCEDURE sales.sp_Orders_UpdateStatus
    @OrderId UNIQUEIDENTIFIER, @Status NVARCHAR(30), @UpdatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    UPDATE sales.CustomerOrders SET Status=@Status,UpdatedAt=SYSUTCDATETIME(),
        ConfirmedBy=CASE WHEN @Status='CONFIRMED' THEN @UpdatedBy ELSE ConfirmedBy END,
        ConfirmedAt=CASE WHEN @Status='CONFIRMED' THEN SYSUTCDATETIME() ELSE ConfirmedAt END
    WHERE OrderId=@OrderId;
END
GO

-- ── 4.20  INVOICES ───────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE billing.sp_Invoices_GetAll
    @TenantId UNIQUEIDENTIFIER, @Status NVARCHAR(20)=NULL, @ClientId UNIQUEIDENTIFIER=NULL
AS BEGIN SET NOCOUNT ON;
    SELECT i.InvoiceId,i.InvoiceNo,i.InvoiceDate,i.Status,i.SalesType,
           c.ClientName,s.StoreName,i.TotalQuantity,i.TaxableAmount,i.TotalGST,i.GrandTotal
    FROM billing.Invoices i JOIN sales.Clients c ON c.ClientId=i.ClientId
    LEFT JOIN sales.Stores s ON s.StoreId=i.StoreId
    WHERE i.TenantId=@TenantId
      AND (@Status IS NULL OR i.Status=@Status)
      AND (@ClientId IS NULL OR i.ClientId=@ClientId)
    ORDER BY i.InvoiceDate DESC;
END
GO
CREATE OR ALTER PROCEDURE billing.sp_Invoices_GetById @InvoiceId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT i.*,c.ClientName,c.GSTIN AS ClientGSTIN,s.StoreName FROM billing.Invoices i
    JOIN sales.Clients c ON c.ClientId=i.ClientId LEFT JOIN sales.Stores s ON s.StoreId=i.StoreId
    WHERE i.InvoiceId=@InvoiceId;
    SELECT il.*,a.ArticleCode FROM billing.InvoiceLines il
    JOIN product.Articles a ON a.ArticleId=il.ArticleId
    WHERE il.InvoiceId=@InvoiceId ORDER BY il.LineNumber;
END
GO
CREATE OR ALTER PROCEDURE billing.sp_Invoices_Create
    @TenantId UNIQUEIDENTIFIER, @InvoiceNo NVARCHAR(50), @InvoiceDate DATE,
    @ClientId UNIQUEIDENTIFIER, @StoreId UNIQUEIDENTIFIER, @OrderId UNIQUEIDENTIFIER=NULL,
    @IsInterState BIT=0, @SalesType NVARCHAR(20)='Local', @Notes NVARCHAR(2000)=NULL,
    @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM billing.Invoices WHERE TenantId=@TenantId AND InvoiceNo=@InvoiceNo)
        THROW 50001,N'Invoice number already exists.',1;
    DECLARE @Id UNIQUEIDENTIFIER=NEWID();
    INSERT INTO billing.Invoices(InvoiceId,TenantId,InvoiceNo,InvoiceDate,ClientId,StoreId,
        OrderId,IsInterState,SalesType,Status,TotalQuantity,SubTotal,TaxableAmount,
        CGSTAmount,SGSTAmount,IGSTAmount,TotalGST,TotalAmount,GrandTotal,NetPayable,Notes,CreatedBy,CreatedAt)
    VALUES(@Id,@TenantId,@InvoiceNo,@InvoiceDate,@ClientId,@StoreId,
        @OrderId,@IsInterState,@SalesType,'Draft',0,0,0,0,0,0,0,0,0,0,@Notes,@CreatedBy,SYSUTCDATETIME());
    SELECT @Id AS InvoiceId;
END
GO
CREATE OR ALTER PROCEDURE billing.sp_Invoices_AddLine
    @InvoiceId UNIQUEIDENTIFIER, @LineNumber INT, @ArticleId UNIQUEIDENTIFIER,
    @ArticleCode NVARCHAR(50), @ArticleName NVARCHAR(300), @HSNCode NVARCHAR(20),
    @Color NVARCHAR(100)=NULL, @EuroSize INT=NULL, @Quantity INT,
    @MRP DECIMAL(12,2), @MarginPercent DECIMAL(5,2)=0, @GSTRate DECIMAL(5,2)=18.00
AS BEGIN SET NOCOUNT ON;
    DECLARE @IsInterState BIT;
    SELECT @IsInterState=IsInterState FROM billing.Invoices WHERE InvoiceId=@InvoiceId;
    DECLARE @MarginAmt  DECIMAL(12,2) = ROUND(@MRP*@MarginPercent/100,2);
    DECLARE @UnitPrice  DECIMAL(12,2) = @MRP - @MarginAmt;
    DECLARE @TaxableAmt DECIMAL(14,2) = ROUND(@Quantity*@UnitPrice,2);
    DECLARE @Half       DECIMAL(5,2)  = @GSTRate/2;
    DECLARE @CGSTRate   DECIMAL(5,2)  = CASE WHEN @IsInterState=0 THEN @Half     ELSE 0        END;
    DECLARE @SGSTRate   DECIMAL(5,2)  = CASE WHEN @IsInterState=0 THEN @Half     ELSE 0        END;
    DECLARE @IGSTRate   DECIMAL(5,2)  = CASE WHEN @IsInterState=1 THEN @GSTRate  ELSE 0        END;
    DECLARE @CGSTAmt    DECIMAL(12,2) = ROUND(@TaxableAmt*@CGSTRate/100,2);
    DECLARE @SGSTAmt    DECIMAL(12,2) = ROUND(@TaxableAmt*@SGSTRate/100,2);
    DECLARE @IGSTAmt    DECIMAL(12,2) = ROUND(@TaxableAmt*@IGSTRate/100,2);
    DECLARE @TotalAmt   DECIMAL(14,2) = @TaxableAmt+@CGSTAmt+@SGSTAmt+@IGSTAmt;
    INSERT INTO billing.InvoiceLines(InvoiceLineId,InvoiceId,LineNumber,ArticleId,ArticleCode,ArticleName,
        HSNCode,Color,EuroSize,UOM,Quantity,MRP,MarginPercent,MarginAmount,UnitPrice,
        TaxableAmount,GSTRate,CGSTRate,CGSTAmount,SGSTRate,SGSTAmount,IGSTRate,IGSTAmount,
        TotalAmount,LineTotal,TotalBilling)
    VALUES(NEWID(),@InvoiceId,@LineNumber,@ArticleId,@ArticleCode,@ArticleName,
        @HSNCode,@Color,@EuroSize,'PAIRS',@Quantity,@MRP,@MarginPercent,@MarginAmt,@UnitPrice,
        @TaxableAmt,@GSTRate,@CGSTRate,@CGSTAmt,@SGSTRate,@SGSTAmt,@IGSTRate,@IGSTAmt,
        @TotalAmt,@TotalAmt,@TotalAmt);
    UPDATE billing.Invoices SET
        TotalQuantity=(SELECT ISNULL(SUM(Quantity),0)      FROM billing.InvoiceLines WHERE InvoiceId=@InvoiceId),
        SubTotal     =(SELECT ISNULL(SUM(Quantity*MRP),0)  FROM billing.InvoiceLines WHERE InvoiceId=@InvoiceId),
        TaxableAmount=(SELECT ISNULL(SUM(TaxableAmount),0) FROM billing.InvoiceLines WHERE InvoiceId=@InvoiceId),
        CGSTAmount   =(SELECT ISNULL(SUM(CGSTAmount),0)    FROM billing.InvoiceLines WHERE InvoiceId=@InvoiceId),
        SGSTAmount   =(SELECT ISNULL(SUM(SGSTAmount),0)    FROM billing.InvoiceLines WHERE InvoiceId=@InvoiceId),
        IGSTAmount   =(SELECT ISNULL(SUM(IGSTAmount),0)    FROM billing.InvoiceLines WHERE InvoiceId=@InvoiceId),
        TotalGST     =(SELECT ISNULL(SUM(CGSTAmount+SGSTAmount+IGSTAmount),0) FROM billing.InvoiceLines WHERE InvoiceId=@InvoiceId),
        TotalAmount  =(SELECT ISNULL(SUM(TotalAmount),0)   FROM billing.InvoiceLines WHERE InvoiceId=@InvoiceId),
        GrandTotal   =(SELECT ISNULL(SUM(TotalAmount),0)   FROM billing.InvoiceLines WHERE InvoiceId=@InvoiceId),
        NetPayable   =(SELECT ISNULL(SUM(TotalAmount),0)   FROM billing.InvoiceLines WHERE InvoiceId=@InvoiceId)
    WHERE InvoiceId=@InvoiceId;
END
GO
CREATE OR ALTER PROCEDURE billing.sp_Invoices_UpdateStatus
    @InvoiceId UNIQUEIDENTIFIER, @Status NVARCHAR(20), @UpdatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    UPDATE billing.Invoices SET Status=@Status,UpdatedAt=SYSUTCDATETIME() WHERE InvoiceId=@InvoiceId;
END
GO

-- ── 4.21  USERS ──────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE auth.sp_Users_GetAll @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT u.UserId,u.FullName,u.Email,u.AvatarUrl,r.RoleName,u.IsActive,u.LastLoginAt
    FROM auth.Users u LEFT JOIN auth.Roles r ON r.RoleId=u.RoleId
    WHERE u.TenantId=@TenantId ORDER BY u.FullName;
END
GO
CREATE OR ALTER PROCEDURE auth.sp_Users_GetById @UserId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT u.*,r.RoleName FROM auth.Users u LEFT JOIN auth.Roles r ON r.RoleId=u.RoleId
    WHERE u.UserId=@UserId;
END
GO
CREATE OR ALTER PROCEDURE auth.sp_Users_Create
    @TenantId UNIQUEIDENTIFIER, @Email NVARCHAR(200), @PasswordHash NVARCHAR(500),
    @FullName NVARCHAR(200), @RoleId UNIQUEIDENTIFIER, @CreatedBy UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM auth.Users WHERE TenantId=@TenantId AND Email=@Email)
        THROW 50001,N'Email already in use.',1;
    DECLARE @Id UNIQUEIDENTIFIER=NEWID();
    INSERT INTO auth.Users(UserId,TenantId,Email,PasswordHash,FullName,RoleId,IsActive,IsFirstLogin,CreatedBy,CreatedAt)
    VALUES(@Id,@TenantId,@Email,@PasswordHash,@FullName,@RoleId,1,1,@CreatedBy,SYSUTCDATETIME());
    SELECT @Id AS UserId;
END
GO
CREATE OR ALTER PROCEDURE auth.sp_Users_Update
    @UserId UNIQUEIDENTIFIER, @FullName NVARCHAR(200), @RoleId UNIQUEIDENTIFIER, @IsActive BIT
AS BEGIN SET NOCOUNT ON;
    UPDATE auth.Users SET FullName=@FullName,RoleId=@RoleId,IsActive=@IsActive,UpdatedAt=SYSUTCDATETIME()
    WHERE UserId=@UserId;
END
GO
CREATE OR ALTER PROCEDURE auth.sp_Users_ChangePassword
    @UserId UNIQUEIDENTIFIER, @PasswordHash NVARCHAR(500)
AS BEGIN SET NOCOUNT ON;
    UPDATE auth.Users SET PasswordHash=@PasswordHash,IsFirstLogin=0,UpdatedAt=SYSUTCDATETIME()
    WHERE UserId=@UserId;
END
GO
CREATE OR ALTER PROCEDURE auth.sp_Users_Delete @UserId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON; UPDATE auth.Users SET IsActive=0 WHERE UserId=@UserId; END
GO

-- ── 4.22  ROLES & PERMISSIONS ────────────────────────────────────────
CREATE OR ALTER PROCEDURE auth.sp_Roles_GetAll @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT RoleId,RoleName,Description,IsSystem,IsActive FROM auth.Roles WHERE TenantId=@TenantId ORDER BY RoleName;
END
GO
CREATE OR ALTER PROCEDURE auth.sp_Roles_GetPermissions @RoleId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT rp.RolePermissionId,p.PermissionId,p.Module,rp.CanView,rp.CanAdd,rp.CanEdit,rp.CanDelete
    FROM auth.RolePermissions rp JOIN auth.Permissions p ON p.PermissionId=rp.PermissionId
    WHERE rp.RoleId=@RoleId ORDER BY p.Module;
END
GO
CREATE OR ALTER PROCEDURE auth.sp_Roles_Create
    @TenantId UNIQUEIDENTIFIER, @RoleName NVARCHAR(100), @Description NVARCHAR(500)=NULL
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM auth.Roles WHERE TenantId=@TenantId AND RoleName=@RoleName)
        THROW 50001,N'Role name already exists.',1;
    DECLARE @Id UNIQUEIDENTIFIER=NEWID();
    INSERT INTO auth.Roles(RoleId,TenantId,RoleName,Description,IsSystem,IsActive,CreatedAt)
    VALUES(@Id,@TenantId,@RoleName,@Description,0,1,SYSUTCDATETIME());
    SELECT @Id AS RoleId;
END
GO
CREATE OR ALTER PROCEDURE auth.sp_Roles_UpsertPermission
    @RoleId UNIQUEIDENTIFIER, @PermissionId UNIQUEIDENTIFIER,
    @CanView BIT, @CanAdd BIT, @CanEdit BIT, @CanDelete BIT
AS BEGIN SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM auth.RolePermissions WHERE RoleId=@RoleId AND PermissionId=@PermissionId)
        UPDATE auth.RolePermissions SET CanView=@CanView,CanAdd=@CanAdd,CanEdit=@CanEdit,CanDelete=@CanDelete
        WHERE RoleId=@RoleId AND PermissionId=@PermissionId;
    ELSE
        INSERT INTO auth.RolePermissions(RolePermissionId,RoleId,PermissionId,CanView,CanAdd,CanEdit,CanDelete)
        VALUES(NEWID(),@RoleId,@PermissionId,@CanView,@CanAdd,@CanEdit,@CanDelete);
END
GO

-- ── 4.23  AUDIT LOG ──────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE audit.sp_Audit_Insert
    @TenantId UNIQUEIDENTIFIER, @UserId UNIQUEIDENTIFIER, @Action NVARCHAR(50),
    @EntityType NVARCHAR(100), @EntityId NVARCHAR(100)=NULL,
    @OldValues NVARCHAR(MAX)=NULL, @NewValues NVARCHAR(MAX)=NULL,
    @IpAddress NVARCHAR(50)=NULL, @UserAgent NVARCHAR(500)=NULL
AS BEGIN SET NOCOUNT ON;
    INSERT INTO audit.AuditLog(TenantId,UserId,Action,EntityType,EntityId,OldValues,NewValues,IpAddress,UserAgent,Timestamp)
    VALUES(@TenantId,@UserId,@Action,@EntityType,@EntityId,@OldValues,@NewValues,@IpAddress,@UserAgent,SYSUTCDATETIME());
END
GO
CREATE OR ALTER PROCEDURE audit.sp_Audit_Get
    @TenantId UNIQUEIDENTIFIER, @EntityType NVARCHAR(100)=NULL, @EntityId NVARCHAR(100)=NULL,
    @UserId UNIQUEIDENTIFIER=NULL, @FromDate DATETIME2=NULL, @ToDate DATETIME2=NULL,
    @PageNum INT=1, @PageSize INT=50
AS BEGIN SET NOCOUNT ON;
    SELECT al.AuditId,al.Action,al.EntityType,al.EntityId,u.FullName AS UserName,
           al.IpAddress,al.Timestamp,al.OldValues,al.NewValues,COUNT(*) OVER() AS TotalCount
    FROM audit.AuditLog al LEFT JOIN auth.Users u ON u.UserId=al.UserId
    WHERE al.TenantId=@TenantId
      AND (@EntityType IS NULL OR al.EntityType=@EntityType)
      AND (@EntityId   IS NULL OR al.EntityId  =@EntityId)
      AND (@UserId     IS NULL OR al.UserId    =@UserId)
      AND (@FromDate   IS NULL OR al.Timestamp >=@FromDate)
      AND (@ToDate     IS NULL OR al.Timestamp <=@ToDate)
    ORDER BY al.Timestamp DESC
    OFFSET (@PageNum-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- ── 4.24  REPORTS ────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE reporting.sp_Report_GSTSummary
    @TenantId UNIQUEIDENTIFIER, @FromDate DATE, @ToDate DATE
AS BEGIN SET NOCOUNT ON;
    SELECT i.InvoiceNo,i.InvoiceDate,i.SalesType,i.IsInterState,c.ClientName,c.GSTIN,il.HSNCode,
           SUM(il.Quantity) AS TotalQty, SUM(il.TaxableAmount) AS TaxableValue,
           SUM(il.CGSTAmount) AS CGST, SUM(il.SGSTAmount) AS SGST, SUM(il.IGSTAmount) AS IGST,
           SUM(il.TotalAmount) AS TotalAmount
    FROM billing.Invoices i
    JOIN billing.InvoiceLines il ON il.InvoiceId=i.InvoiceId
    JOIN sales.Clients c ON c.ClientId=i.ClientId
    WHERE i.TenantId=@TenantId AND i.InvoiceDate BETWEEN @FromDate AND @ToDate AND i.Status='Confirmed'
    GROUP BY i.InvoiceNo,i.InvoiceDate,i.SalesType,i.IsInterState,c.ClientName,c.GSTIN,il.HSNCode
    ORDER BY i.InvoiceDate,i.InvoiceNo;
END
GO
CREATE OR ALTER PROCEDURE reporting.sp_Report_Sales
    @TenantId UNIQUEIDENTIFIER, @FromDate DATE, @ToDate DATE,
    @ClientId UNIQUEIDENTIFIER=NULL, @GroupBy NVARCHAR(20)='MONTH'
AS BEGIN SET NOCOUNT ON;
    IF @GroupBy='MONTH'
        SELECT YEAR(i.InvoiceDate) AS Yr, MONTH(i.InvoiceDate) AS Mo,
               COUNT(DISTINCT i.InvoiceId) AS InvoiceCount,
               SUM(il.Quantity) AS TotalQty, SUM(il.TaxableAmount) AS TaxableValue, SUM(il.TotalAmount) AS TotalRevenue
        FROM billing.Invoices i JOIN billing.InvoiceLines il ON il.InvoiceId=i.InvoiceId
        WHERE i.TenantId=@TenantId AND i.InvoiceDate BETWEEN @FromDate AND @ToDate AND i.Status='Confirmed'
          AND (@ClientId IS NULL OR i.ClientId=@ClientId)
        GROUP BY YEAR(i.InvoiceDate),MONTH(i.InvoiceDate) ORDER BY Yr,Mo;
    ELSE IF @GroupBy='CLIENT'
        SELECT c.ClientCode,c.ClientName, COUNT(DISTINCT i.InvoiceId) AS InvoiceCount,
               SUM(il.Quantity) AS TotalQty, SUM(il.TotalAmount) AS TotalRevenue
        FROM billing.Invoices i JOIN billing.InvoiceLines il ON il.InvoiceId=i.InvoiceId
        JOIN sales.Clients c ON c.ClientId=i.ClientId
        WHERE i.TenantId=@TenantId AND i.InvoiceDate BETWEEN @FromDate AND @ToDate AND i.Status='Confirmed'
        GROUP BY c.ClientCode,c.ClientName ORDER BY TotalRevenue DESC;
    ELSE
        SELECT a.ArticleCode,a.ArticleName, SUM(il.Quantity) AS TotalQty, SUM(il.TotalAmount) AS TotalRevenue
        FROM billing.Invoices i JOIN billing.InvoiceLines il ON il.InvoiceId=i.InvoiceId
        JOIN product.Articles a ON a.ArticleId=il.ArticleId
        WHERE i.TenantId=@TenantId AND i.InvoiceDate BETWEEN @FromDate AND @ToDate AND i.Status='Confirmed'
          AND (@ClientId IS NULL OR i.ClientId=@ClientId)
        GROUP BY a.ArticleCode,a.ArticleName ORDER BY TotalRevenue DESC;
END
GO

-- ── 4.25  DASHBOARD ──────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE reporting.sp_Dashboard_Summary @TenantId UNIQUEIDENTIFIER AS
BEGIN SET NOCOUNT ON;
    SELECT
        (SELECT COUNT(*) FROM sales.CustomerOrders   WHERE TenantId=@TenantId AND Status NOT IN ('CANCELLED','COMPLETED','DELIVERED')) AS OpenOrders,
        (SELECT COUNT(*) FROM production.ProductionOrders WHERE TenantId=@TenantId AND Status IN ('DRAFT','APPROVED','IN_PRODUCTION'))  AS ActiveProduction,
        (SELECT COUNT(*) FROM inventory.GoodsReceivedNotes WHERE TenantId=@TenantId AND Status='Draft')                                AS PendingGRNs,
        (SELECT ISNULL(SUM(GrandTotal),0) FROM billing.Invoices WHERE TenantId=@TenantId
           AND InvoiceDate>=CAST(DATEADD(DAY,-30,GETUTCDATE()) AS DATE) AND Status='Confirmed')                                        AS Revenue30d;
    SELECT TOP 5 o.OrderNo,o.OrderDate,o.Status,c.ClientName,o.TotalAmount
    FROM sales.CustomerOrders o JOIN sales.Clients c ON c.ClientId=o.ClientId
    WHERE o.TenantId=@TenantId ORDER BY o.CreatedAt DESC;
    SELECT TOP 5 a.ArticleCode,a.ArticleName,SUM(il.TotalAmount) AS Revenue
    FROM billing.Invoices i
    JOIN billing.InvoiceLines il ON il.InvoiceId=i.InvoiceId
    JOIN product.Articles a ON a.ArticleId=il.ArticleId
    WHERE i.TenantId=@TenantId AND i.InvoiceDate>=CAST(DATEADD(DAY,-30,GETUTCDATE()) AS DATE) AND i.Status='Confirmed'
    GROUP BY a.ArticleCode,a.ArticleName ORDER BY Revenue DESC;
    SELECT a.ArticleCode,a.ArticleName,sl.EuroSize,SUM(sl.ClosingStock) AS AvailableQty
    FROM inventory.StockLedger sl JOIN product.Articles a ON a.ArticleId=sl.ArticleId
    WHERE sl.TenantId=@TenantId
    GROUP BY a.ArticleCode,a.ArticleName,sl.EuroSize
    HAVING SUM(sl.ClosingStock) BETWEEN 1 AND 9 ORDER BY AvailableQty;
END
GO

PRINT '>> PART 4: Stored Procedures created.';
GO

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
