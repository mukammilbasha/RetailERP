-- ============================================================
-- RetailERP - Master Data Tables
-- ============================================================
USE RetailERP;
GO

-- Brands
CREATE TABLE master.Brands (
    BrandId         UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    BrandName       NVARCHAR(200)       NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Brands PRIMARY KEY (BrandId),
    CONSTRAINT FK_Brands_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Brands_Name_Tenant UNIQUE (TenantId, BrandName)
);
GO

-- Genders
CREATE TABLE master.Genders (
    GenderId        UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    GenderName      NVARCHAR(50)        NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Genders PRIMARY KEY (GenderId),
    CONSTRAINT FK_Genders_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Genders_Name_Tenant UNIQUE (TenantId, GenderName)
);
GO

-- Seasons
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
    CONSTRAINT UQ_Seasons_Code_Tenant UNIQUE (TenantId, SeasonCode),
    CONSTRAINT CK_Seasons_Dates CHECK (EndDate > StartDate)
);
GO

-- Segments (e.g., Footwear, Leather Goods)
CREATE TABLE master.Segments (
    SegmentId       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    SegmentName     NVARCHAR(200)       NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Segments PRIMARY KEY (SegmentId),
    CONSTRAINT FK_Segments_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Segments_Name_Tenant UNIQUE (TenantId, SegmentName)
);
GO

-- Sub Segments (e.g., Formal, Casual, Sports)
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
    CONSTRAINT FK_SubSegments_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_SubSegments_Name_Segment UNIQUE (SegmentId, SubSegmentName)
);
GO

-- Categories (e.g., Shoes, Bags, Belts)
CREATE TABLE master.Categories (
    CategoryId      UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    CategoryName    NVARCHAR(200)       NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Categories PRIMARY KEY (CategoryId),
    CONSTRAINT FK_Categories_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Categories_Name_Tenant UNIQUE (TenantId, CategoryName)
);
GO

-- Sub Categories (e.g., Derby, Oxford, Loafer, Sneaker)
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
    CONSTRAINT FK_SubCategories_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_SubCategories_Name_Cat UNIQUE (CategoryId, SubCategoryName)
);
GO

-- Groups (design family / collection)
CREATE TABLE master.Groups (
    GroupId         UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    GroupName       NVARCHAR(200)       NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Groups PRIMARY KEY (GroupId),
    CONSTRAINT FK_Groups_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Groups_Name_Tenant UNIQUE (TenantId, GroupName)
);
GO

-- Colors
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

-- Styles
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

-- Fasteners
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

-- Size Chart Master (Footwear)
CREATE TABLE master.SizeCharts (
    SizeChartId     UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    ChartType       NVARCHAR(50)        NOT NULL, -- 'Footwear' or 'Apparel'
    GenderId        UNIQUEIDENTIFIER    NOT NULL,
    AgeGroup        NVARCHAR(50)        NOT NULL DEFAULT 'Adult', -- Adult, Kids, Toddler, Infant
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

-- HSN Codes
CREATE TABLE master.HSNCodes (
    HSNId           UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    HSNCode         NVARCHAR(20)        NOT NULL,
    Description     NVARCHAR(500)       NULL,
    GSTRate         DECIMAL(5,2)        NOT NULL DEFAULT 18.00,
    CONSTRAINT PK_HSNCodes PRIMARY KEY (HSNId),
    CONSTRAINT UQ_HSNCodes_Code UNIQUE (HSNCode)
);
GO

-- States (Indian states for GST)
CREATE TABLE master.States (
    StateId         INT                 NOT NULL,
    StateName       NVARCHAR(100)       NOT NULL,
    StateCode       NVARCHAR(5)         NOT NULL,
    Zone            NVARCHAR(20)        NOT NULL, -- NORTH, SOUTH, EAST, WEST, CENTRAL
    CONSTRAINT PK_States PRIMARY KEY (StateId),
    CONSTRAINT UQ_States_Code UNIQUE (StateCode)
);
GO

PRINT 'Master tables created successfully.';
GO
