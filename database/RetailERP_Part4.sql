
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
