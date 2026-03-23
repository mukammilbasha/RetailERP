-- ============================================================
-- RetailERP - Inventory Stored Procedures
-- ============================================================
USE RetailERP;
GO

CREATE OR ALTER PROCEDURE inventory.sp_StockLedger_GetByWarehouse
    @TenantId UNIQUEIDENTIFIER,
    @WarehouseId UNIQUEIDENTIFIER,
    @SearchTerm NVARCHAR(200) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 25
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        sl.StockLedgerId, sl.WarehouseId, sl.ArticleId, sl.EuroSize,
        sl.OpeningStock, sl.InwardQty, sl.OutwardQty, sl.ClosingStock, sl.LastUpdated,
        a.ArticleCode, a.ArticleName, a.Color, a.MRP,
        w.WarehouseName
    FROM inventory.StockLedger sl
    INNER JOIN product.Articles a ON sl.ArticleId = a.ArticleId
    INNER JOIN warehouse.Warehouses w ON sl.WarehouseId = w.WarehouseId
    WHERE sl.TenantId = @TenantId AND sl.WarehouseId = @WarehouseId
        AND (@SearchTerm IS NULL OR a.ArticleName LIKE '%' + @SearchTerm + '%' OR a.ArticleCode LIKE '%' + @SearchTerm + '%')
    ORDER BY a.ArticleCode, sl.EuroSize
    OFFSET (@PageNumber - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM inventory.StockLedger sl
    INNER JOIN product.Articles a ON sl.ArticleId = a.ArticleId
    WHERE sl.TenantId = @TenantId AND sl.WarehouseId = @WarehouseId
        AND (@SearchTerm IS NULL OR a.ArticleName LIKE '%' + @SearchTerm + '%' OR a.ArticleCode LIKE '%' + @SearchTerm + '%');
END;
GO

CREATE OR ALTER PROCEDURE inventory.sp_Stock_CheckAvailability
    @TenantId UNIQUEIDENTIFIER,
    @WarehouseId UNIQUEIDENTIFIER,
    @ArticleId UNIQUEIDENTIFIER,
    @EuroSize INT = NULL,
    @RequiredQty INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AvailableStock INT;

    SELECT @AvailableStock = ISNULL(SUM(ClosingStock), 0)
    FROM inventory.StockLedger
    WHERE TenantId = @TenantId
        AND WarehouseId = @WarehouseId
        AND ArticleId = @ArticleId
        AND (@EuroSize IS NULL OR EuroSize = @EuroSize);

    SELECT
        @AvailableStock AS AvailableStock,
        @RequiredQty AS RequiredQty,
        CASE WHEN @AvailableStock >= @RequiredQty THEN 1 ELSE 0 END AS IsAvailable;
END;
GO

CREATE OR ALTER PROCEDURE inventory.sp_StockMovement_Record
    @TenantId UNIQUEIDENTIFIER,
    @WarehouseId UNIQUEIDENTIFIER,
    @ArticleId UNIQUEIDENTIFIER,
    @EuroSize INT = NULL,
    @MovementType NVARCHAR(30),
    @Direction NVARCHAR(10),
    @Quantity INT,
    @ReferenceType NVARCHAR(50) = NULL,
    @ReferenceId UNIQUEIDENTIFIER = NULL,
    @Notes NVARCHAR(500) = NULL,
    @CreatedBy UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        -- Record the movement
        INSERT INTO inventory.StockMovements (
            MovementId, TenantId, WarehouseId, ArticleId, EuroSize,
            MovementType, Direction, Quantity, ReferenceType, ReferenceId, Notes, CreatedBy
        ) VALUES (
            NEWID(), @TenantId, @WarehouseId, @ArticleId, @EuroSize,
            @MovementType, @Direction, @Quantity, @ReferenceType, @ReferenceId, @Notes, @CreatedBy
        );

        -- Update stock ledger
        IF NOT EXISTS (
            SELECT 1 FROM inventory.StockLedger
            WHERE TenantId = @TenantId AND WarehouseId = @WarehouseId
                AND ArticleId = @ArticleId AND ISNULL(EuroSize, 0) = ISNULL(@EuroSize, 0)
        )
        BEGIN
            INSERT INTO inventory.StockLedger (StockLedgerId, TenantId, WarehouseId, ArticleId, EuroSize, OpeningStock, InwardQty, OutwardQty)
            VALUES (NEWID(), @TenantId, @WarehouseId, @ArticleId, @EuroSize, 0, 0, 0);
        END

        IF @Direction = 'INWARD'
        BEGIN
            UPDATE inventory.StockLedger
            SET InwardQty = InwardQty + @Quantity,
                LastUpdated = SYSUTCDATETIME()
            WHERE TenantId = @TenantId AND WarehouseId = @WarehouseId
                AND ArticleId = @ArticleId AND ISNULL(EuroSize, 0) = ISNULL(@EuroSize, 0);
        END
        ELSE
        BEGIN
            UPDATE inventory.StockLedger
            SET OutwardQty = OutwardQty + @Quantity,
                LastUpdated = SYSUTCDATETIME()
            WHERE TenantId = @TenantId AND WarehouseId = @WarehouseId
                AND ArticleId = @ArticleId AND ISNULL(EuroSize, 0) = ISNULL(@EuroSize, 0);
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE inventory.sp_StockOverview_Get
    @TenantId UNIQUEIDENTIFIER,
    @WarehouseId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        a.ArticleCode, a.ArticleName, a.Color,
        w.WarehouseName, w.WarehouseCode,
        SUM(sl.ClosingStock) AS TotalStock,
        SUM(CASE WHEN sl.EuroSize = 39 THEN sl.ClosingStock ELSE 0 END) AS [Size_39],
        SUM(CASE WHEN sl.EuroSize = 40 THEN sl.ClosingStock ELSE 0 END) AS [Size_40],
        SUM(CASE WHEN sl.EuroSize = 41 THEN sl.ClosingStock ELSE 0 END) AS [Size_41],
        SUM(CASE WHEN sl.EuroSize = 42 THEN sl.ClosingStock ELSE 0 END) AS [Size_42],
        SUM(CASE WHEN sl.EuroSize = 43 THEN sl.ClosingStock ELSE 0 END) AS [Size_43],
        SUM(CASE WHEN sl.EuroSize = 44 THEN sl.ClosingStock ELSE 0 END) AS [Size_44],
        SUM(CASE WHEN sl.EuroSize = 45 THEN sl.ClosingStock ELSE 0 END) AS [Size_45],
        SUM(CASE WHEN sl.EuroSize = 46 THEN sl.ClosingStock ELSE 0 END) AS [Size_46]
    FROM inventory.StockLedger sl
    INNER JOIN product.Articles a ON sl.ArticleId = a.ArticleId
    INNER JOIN warehouse.Warehouses w ON sl.WarehouseId = w.WarehouseId
    WHERE sl.TenantId = @TenantId
        AND (@WarehouseId IS NULL OR sl.WarehouseId = @WarehouseId)
    GROUP BY a.ArticleCode, a.ArticleName, a.Color, w.WarehouseName, w.WarehouseCode
    ORDER BY a.ArticleCode;
END;
GO
