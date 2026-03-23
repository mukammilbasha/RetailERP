-- ============================================================
-- RetailERP - Product / Article Tables
-- ============================================================
USE RetailERP;
GO

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
