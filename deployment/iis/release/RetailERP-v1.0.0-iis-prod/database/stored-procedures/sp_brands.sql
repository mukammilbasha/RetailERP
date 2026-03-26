-- ============================================================
-- RetailERP - Brand CRUD Stored Procedures
-- ============================================================
USE RetailERP;
GO

CREATE OR ALTER PROCEDURE master.sp_Brand_GetAll
    @TenantId UNIQUEIDENTIFIER,
    @SearchTerm NVARCHAR(200) = NULL,
    @IsActive BIT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 25
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        BrandId, TenantId, BrandName, IsActive, CreatedAt, UpdatedAt
    FROM master.Brands
    WHERE TenantId = @TenantId
        AND (@SearchTerm IS NULL OR BrandName LIKE '%' + @SearchTerm + '%')
        AND (@IsActive IS NULL OR IsActive = @IsActive)
    ORDER BY BrandName
    OFFSET (@PageNumber - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM master.Brands
    WHERE TenantId = @TenantId
        AND (@SearchTerm IS NULL OR BrandName LIKE '%' + @SearchTerm + '%')
        AND (@IsActive IS NULL OR IsActive = @IsActive);
END;
GO

CREATE OR ALTER PROCEDURE master.sp_Brand_GetById
    @BrandId UNIQUEIDENTIFIER,
    @TenantId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT BrandId, TenantId, BrandName, IsActive, CreatedAt, UpdatedAt
    FROM master.Brands
    WHERE BrandId = @BrandId AND TenantId = @TenantId;
END;
GO

CREATE OR ALTER PROCEDURE master.sp_Brand_Create
    @TenantId UNIQUEIDENTIFIER,
    @BrandName NVARCHAR(200),
    @IsActive BIT = 1,
    @CreatedBy UNIQUEIDENTIFIER = NULL,
    @BrandId UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @BrandId = NEWID();

    INSERT INTO master.Brands (BrandId, TenantId, BrandName, IsActive, CreatedBy)
    VALUES (@BrandId, @TenantId, @BrandName, @IsActive, @CreatedBy);
END;
GO

CREATE OR ALTER PROCEDURE master.sp_Brand_Update
    @BrandId UNIQUEIDENTIFIER,
    @TenantId UNIQUEIDENTIFIER,
    @BrandName NVARCHAR(200),
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE master.Brands
    SET BrandName = @BrandName,
        IsActive = @IsActive,
        UpdatedAt = SYSUTCDATETIME()
    WHERE BrandId = @BrandId AND TenantId = @TenantId;
END;
GO

CREATE OR ALTER PROCEDURE master.sp_Brand_Delete
    @BrandId UNIQUEIDENTIFIER,
    @TenantId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM product.Articles WHERE BrandId = @BrandId)
    BEGIN
        UPDATE master.Brands SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
        WHERE BrandId = @BrandId AND TenantId = @TenantId;
    END
    ELSE
    BEGIN
        DELETE FROM master.Brands WHERE BrandId = @BrandId AND TenantId = @TenantId;
    END
END;
GO
