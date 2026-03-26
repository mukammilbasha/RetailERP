-- ============================================================
-- RetailERP - Article CRUD Stored Procedures
-- ============================================================
USE RetailERP;
GO

CREATE OR ALTER PROCEDURE product.sp_Article_GetAll
    @TenantId UNIQUEIDENTIFIER,
    @SearchTerm NVARCHAR(200) = NULL,
    @BrandId UNIQUEIDENTIFIER = NULL,
    @CategoryId UNIQUEIDENTIFIER = NULL,
    @SegmentId UNIQUEIDENTIFIER = NULL,
    @SeasonId UNIQUEIDENTIFIER = NULL,
    @IsActive BIT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 25
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        a.ArticleId, a.ArticleCode, a.ArticleName, a.Color, a.Style,
        a.HSNCode, a.UOM, a.MRP, a.CBD, a.IsSizeBased, a.IsActive, a.ImageUrl,
        b.BrandName, s.SegmentName, c.CategoryName, sc.SubCategoryName,
        g.GroupName, se.SeasonCode, gen.GenderName,
        fd.Last, fd.UpperLeather, fd.LiningLeather, fd.Sole,
        fd.SizeRunFrom, fd.SizeRunTo
    FROM product.Articles a
    LEFT JOIN master.Brands b ON a.BrandId = b.BrandId
    LEFT JOIN master.Segments s ON a.SegmentId = s.SegmentId
    LEFT JOIN master.Categories c ON a.CategoryId = c.CategoryId
    LEFT JOIN master.SubCategories sc ON a.SubCategoryId = sc.SubCategoryId
    LEFT JOIN master.Groups g ON a.GroupId = g.GroupId
    LEFT JOIN master.Seasons se ON a.SeasonId = se.SeasonId
    LEFT JOIN master.Genders gen ON a.GenderId = gen.GenderId
    LEFT JOIN product.FootwearDetails fd ON a.ArticleId = fd.ArticleId
    WHERE a.TenantId = @TenantId
        AND (@SearchTerm IS NULL OR a.ArticleName LIKE '%' + @SearchTerm + '%' OR a.ArticleCode LIKE '%' + @SearchTerm + '%')
        AND (@BrandId IS NULL OR a.BrandId = @BrandId)
        AND (@CategoryId IS NULL OR a.CategoryId = @CategoryId)
        AND (@SegmentId IS NULL OR a.SegmentId = @SegmentId)
        AND (@SeasonId IS NULL OR a.SeasonId = @SeasonId)
        AND (@IsActive IS NULL OR a.IsActive = @IsActive)
    ORDER BY a.ArticleCode
    OFFSET (@PageNumber - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM product.Articles a
    WHERE a.TenantId = @TenantId
        AND (@SearchTerm IS NULL OR a.ArticleName LIKE '%' + @SearchTerm + '%' OR a.ArticleCode LIKE '%' + @SearchTerm + '%')
        AND (@BrandId IS NULL OR a.BrandId = @BrandId)
        AND (@CategoryId IS NULL OR a.CategoryId = @CategoryId)
        AND (@SegmentId IS NULL OR a.SegmentId = @SegmentId)
        AND (@SeasonId IS NULL OR a.SeasonId = @SeasonId)
        AND (@IsActive IS NULL OR a.IsActive = @IsActive);
END;
GO

CREATE OR ALTER PROCEDURE product.sp_Article_GetById
    @ArticleId UNIQUEIDENTIFIER,
    @TenantId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT a.*, b.BrandName, s.SegmentName, ss.SubSegmentName,
           c.CategoryName, sc.SubCategoryName, g.GroupName,
           se.SeasonCode, gen.GenderName
    FROM product.Articles a
    LEFT JOIN master.Brands b ON a.BrandId = b.BrandId
    LEFT JOIN master.Segments s ON a.SegmentId = s.SegmentId
    LEFT JOIN master.SubSegments ss ON a.SubSegmentId = ss.SubSegmentId
    LEFT JOIN master.Categories c ON a.CategoryId = c.CategoryId
    LEFT JOIN master.SubCategories sc ON a.SubCategoryId = sc.SubCategoryId
    LEFT JOIN master.Groups g ON a.GroupId = g.GroupId
    LEFT JOIN master.Seasons se ON a.SeasonId = se.SeasonId
    LEFT JOIN master.Genders gen ON a.GenderId = gen.GenderId
    WHERE a.ArticleId = @ArticleId AND a.TenantId = @TenantId;

    -- Footwear details
    SELECT * FROM product.FootwearDetails WHERE ArticleId = @ArticleId;

    -- Leather goods details
    SELECT * FROM product.LeatherGoodsDetails WHERE ArticleId = @ArticleId;

    -- Sizes
    SELECT * FROM product.ArticleSizes WHERE ArticleId = @ArticleId ORDER BY EuroSize;
END;
GO

CREATE OR ALTER PROCEDURE product.sp_Article_Create
    @TenantId UNIQUEIDENTIFIER,
    @ArticleCode NVARCHAR(50),
    @ArticleName NVARCHAR(300),
    @BrandId UNIQUEIDENTIFIER,
    @SegmentId UNIQUEIDENTIFIER,
    @SubSegmentId UNIQUEIDENTIFIER = NULL,
    @CategoryId UNIQUEIDENTIFIER,
    @SubCategoryId UNIQUEIDENTIFIER = NULL,
    @GroupId UNIQUEIDENTIFIER = NULL,
    @SeasonId UNIQUEIDENTIFIER = NULL,
    @GenderId UNIQUEIDENTIFIER,
    @Color NVARCHAR(100),
    @Style NVARCHAR(100) = NULL,
    @Fastener NVARCHAR(100) = NULL,
    @HSNCode NVARCHAR(20),
    @UOM NVARCHAR(20) = 'PAIRS',
    @MRP DECIMAL(12,2) = 0,
    @CBD DECIMAL(12,2) = 0,
    @IsSizeBased BIT = 1,
    @LaunchDate DATE = NULL,
    @CreatedBy UNIQUEIDENTIFIER = NULL,
    @ArticleId UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @ArticleId = NEWID();

    INSERT INTO product.Articles (
        ArticleId, TenantId, ArticleCode, ArticleName, BrandId, SegmentId,
        SubSegmentId, CategoryId, SubCategoryId, GroupId, SeasonId, GenderId,
        Color, Style, Fastener, HSNCode, UOM, MRP, CBD, IsSizeBased, LaunchDate, CreatedBy
    ) VALUES (
        @ArticleId, @TenantId, @ArticleCode, @ArticleName, @BrandId, @SegmentId,
        @SubSegmentId, @CategoryId, @SubCategoryId, @GroupId, @SeasonId, @GenderId,
        @Color, @Style, @Fastener, @HSNCode, @UOM, @MRP, @CBD, @IsSizeBased, @LaunchDate, @CreatedBy
    );
END;
GO

CREATE OR ALTER PROCEDURE product.sp_Article_GenerateEAN
    @ArticleId UNIQUEIDENTIFIER,
    @SizeRunFrom INT,
    @SizeRunTo INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Size INT = @SizeRunFrom;
    DECLARE @Counter INT;

    SELECT @Counter = ISNULL(MAX(CAST(RIGHT(EANCode, 6) AS INT)), 100000)
    FROM product.ArticleSizes;

    WHILE @Size <= @SizeRunTo
    BEGIN
        SET @Counter = @Counter + 1;

        IF NOT EXISTS (SELECT 1 FROM product.ArticleSizes WHERE ArticleId = @ArticleId AND EuroSize = @Size)
        BEGIN
            INSERT INTO product.ArticleSizes (ArticleSizeId, ArticleId, EuroSize, EANCode)
            VALUES (NEWID(), @ArticleId, @Size, '890' + RIGHT('000000' + CAST(@Counter AS NVARCHAR), 10));
        END

        SET @Size = @Size + 1;
    END
END;
GO
