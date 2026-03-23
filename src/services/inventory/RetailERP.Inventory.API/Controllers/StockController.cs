using System.Data;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Inventory.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StockController : ControllerBase
{
    private readonly string _connectionString;
    private readonly ILogger<StockController> _logger;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public StockController(IConfiguration configuration, ILogger<StockController> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        _logger = logger;
    }

    private IDbConnection CreateConnection() => new SqlConnection(_connectionString);

    // ────────────────────────────────────────────────────────────
    // GET /api/stock — Get all stock (paginated, searchable)
    // ────────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<StockListRow>>>> GetAll(
        [FromQuery] StockQueryParams query, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();

            var sql = @"
                SELECT
                    sl.StockLedgerId, sl.WarehouseId, sl.ArticleId, sl.EuroSize,
                    sl.OpeningStock, sl.InwardQty, sl.OutwardQty, sl.ClosingStock, sl.LastUpdated,
                    a.ArticleCode, a.ArticleName, a.Color, a.HSNCode, a.MRP, a.UOM, a.IsSizeBased,
                    w.WarehouseName, w.WarehouseCode,
                    b.BrandName, seg.SegmentName, g.GenderName
                FROM inventory.StockLedger sl
                INNER JOIN product.Articles a ON sl.ArticleId = a.ArticleId
                INNER JOIN warehouse.Warehouses w ON sl.WarehouseId = w.WarehouseId
                LEFT JOIN master.Brands b ON a.BrandId = b.BrandId
                LEFT JOIN master.Segments seg ON a.SegmentId = seg.SegmentId
                LEFT JOIN master.Genders g ON a.GenderId = g.GenderId
                WHERE sl.TenantId = @TenantId
                    AND (@WarehouseId IS NULL OR sl.WarehouseId = @WarehouseId)
                    AND (@Search IS NULL
                         OR a.ArticleName LIKE '%' + @Search + '%'
                         OR a.ArticleCode LIKE '%' + @Search + '%'
                         OR a.Color LIKE '%' + @Search + '%')
                ORDER BY a.ArticleCode, sl.EuroSize
                OFFSET (@PageNumber - 1) * @PageSize ROWS
                FETCH NEXT @PageSize ROWS ONLY;

                SELECT COUNT(*) AS TotalCount
                FROM inventory.StockLedger sl
                INNER JOIN product.Articles a ON sl.ArticleId = a.ArticleId
                WHERE sl.TenantId = @TenantId
                    AND (@WarehouseId IS NULL OR sl.WarehouseId = @WarehouseId)
                    AND (@Search IS NULL
                         OR a.ArticleName LIKE '%' + @Search + '%'
                         OR a.ArticleCode LIKE '%' + @Search + '%'
                         OR a.Color LIKE '%' + @Search + '%');";

            var parameters = new
            {
                TenantId,
                WarehouseId = query.WarehouseId,
                Search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search,
                PageNumber = query.PageNumber > 0 ? query.PageNumber : 1,
                PageSize = query.PageSize > 0 ? Math.Min(query.PageSize, 100) : 25
            };

            using var multi = await conn.QueryMultipleAsync(sql, parameters);
            var items = (await multi.ReadAsync<StockListRow>()).ToList();
            var totalCount = await multi.ReadSingleAsync<int>();

            var result = new PagedResult<StockListRow>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = parameters.PageNumber,
                PageSize = parameters.PageSize
            };

            return Ok(ApiResponse<PagedResult<StockListRow>>.Ok(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving stock list");
            return StatusCode(500, ApiResponse<PagedResult<StockListRow>>.Fail("An error occurred while retrieving stock list"));
        }
    }

    // ────────────────────────────────────────────────────────────
    // GET /api/stock/warehouse/{warehouseId} — Get stock by warehouse
    // ────────────────────────────────────────────────────────────
    [HttpGet("warehouse/{warehouseId:guid}")]
    public async Task<ActionResult<ApiResponse<List<StockListRow>>>> GetByWarehouse(
        Guid warehouseId, [FromQuery] string? search, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();

            var sql = @"
                SELECT
                    sl.StockLedgerId, sl.WarehouseId, sl.ArticleId, sl.EuroSize,
                    sl.OpeningStock, sl.InwardQty, sl.OutwardQty, sl.ClosingStock, sl.LastUpdated,
                    a.ArticleCode, a.ArticleName, a.Color, a.HSNCode, a.MRP, a.UOM, a.IsSizeBased,
                    w.WarehouseName, w.WarehouseCode,
                    b.BrandName, seg.SegmentName, g.GenderName
                FROM inventory.StockLedger sl
                INNER JOIN product.Articles a ON sl.ArticleId = a.ArticleId
                INNER JOIN warehouse.Warehouses w ON sl.WarehouseId = w.WarehouseId
                LEFT JOIN master.Brands b ON a.BrandId = b.BrandId
                LEFT JOIN master.Segments seg ON a.SegmentId = seg.SegmentId
                LEFT JOIN master.Genders g ON a.GenderId = g.GenderId
                WHERE sl.TenantId = @TenantId AND sl.WarehouseId = @WarehouseId
                    AND (@Search IS NULL
                         OR a.ArticleName LIKE '%' + @Search + '%'
                         OR a.ArticleCode LIKE '%' + @Search + '%')
                ORDER BY a.ArticleCode, sl.EuroSize";

            var result = (await conn.QueryAsync<StockListRow>(sql, new
            {
                TenantId,
                WarehouseId = warehouseId,
                Search = string.IsNullOrWhiteSpace(search) ? null : search
            })).ToList();

            return Ok(ApiResponse<List<StockListRow>>.Ok(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving stock for warehouse {WarehouseId}", warehouseId);
            return StatusCode(500, ApiResponse<List<StockListRow>>.Fail("An error occurred while retrieving warehouse stock"));
        }
    }

    // ────────────────────────────────────────────────────────────
    // GET /api/stock/warehouse/{warehouseId}/article/{articleId}
    //   Size-wise stock for a specific article in a warehouse.
    //   CRITICAL endpoint for the order entry screen.
    // ────────────────────────────────────────────────────────────
    [HttpGet("warehouse/{warehouseId:guid}/article/{articleId:guid}")]
    public async Task<ActionResult<ApiResponse<ArticleSizeStockResponse>>> GetSizeWiseStock(
        Guid warehouseId, Guid articleId, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();

            // Fetch article metadata + all size rows in a single round-trip
            var sql = @"
                -- Article header
                SELECT
                    a.ArticleId, a.ArticleCode, a.ArticleName, a.Color, a.HSNCode,
                    a.MRP, a.UOM, a.IsSizeBased,
                    b.BrandName, seg.SegmentName, g.GenderName
                FROM product.Articles a
                LEFT JOIN master.Brands b ON a.BrandId = b.BrandId
                LEFT JOIN master.Segments seg ON a.SegmentId = seg.SegmentId
                LEFT JOIN master.Genders g ON a.GenderId = g.GenderId
                WHERE a.ArticleId = @ArticleId AND a.TenantId = @TenantId;

                -- Size-wise stock rows
                SELECT
                    sl.EuroSize,
                    sl.OpeningStock,
                    sl.InwardQty,
                    sl.OutwardQty,
                    sl.ClosingStock,
                    sl.LastUpdated
                FROM inventory.StockLedger sl
                WHERE sl.TenantId = @TenantId
                    AND sl.WarehouseId = @WarehouseId
                    AND sl.ArticleId = @ArticleId
                ORDER BY sl.EuroSize;";

            using var multi = await conn.QueryMultipleAsync(sql, new
            {
                TenantId,
                WarehouseId = warehouseId,
                ArticleId = articleId
            });

            var article = await multi.ReadSingleOrDefaultAsync<ArticleHeaderRow>();
            if (article == null)
                return NotFound(ApiResponse<ArticleSizeStockResponse>.Fail("Article not found"));

            var sizeRows = (await multi.ReadAsync<SizeStockRow>()).ToList();

            var response = new ArticleSizeStockResponse
            {
                ArticleId = article.ArticleId,
                ArticleCode = article.ArticleCode,
                ArticleName = article.ArticleName,
                Color = article.Color,
                HsnCode = article.HSNCode,
                Mrp = article.MRP,
                Uom = article.UOM,
                BrandName = article.BrandName,
                SegmentName = article.SegmentName,
                GenderName = article.GenderName,
                IsSizeBased = article.IsSizeBased,
                SizeStock = sizeRows
            };

            return Ok(ApiResponse<ArticleSizeStockResponse>.Ok(response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving size-wise stock for article {ArticleId} in warehouse {WarehouseId}",
                articleId, warehouseId);
            return StatusCode(500, ApiResponse<ArticleSizeStockResponse>.Fail("An error occurred while retrieving article stock"));
        }
    }

    // ────────────────────────────────────────────────────────────
    // POST /api/stock/movement — Record a stock movement
    // ────────────────────────────────────────────────────────────
    [HttpPost("movement")]
    public async Task<ActionResult<ApiResponse<StockMovementResponse>>> RecordMovement(
        [FromBody] RecordStockMovementRequest request, CancellationToken ct)
    {
        try
        {
            if (request.Quantity <= 0)
                return BadRequest(ApiResponse<StockMovementResponse>.Fail("Quantity must be greater than zero"));

            if (string.IsNullOrWhiteSpace(request.MovementType))
                return BadRequest(ApiResponse<StockMovementResponse>.Fail("MovementType is required"));

            if (string.IsNullOrWhiteSpace(request.Direction) ||
                (request.Direction != "INWARD" && request.Direction != "OUTWARD"))
                return BadRequest(ApiResponse<StockMovementResponse>.Fail("Direction must be INWARD or OUTWARD"));

            using var conn = CreateConnection();

            var parameters = new DynamicParameters();
            parameters.Add("TenantId", TenantId);
            parameters.Add("WarehouseId", request.WarehouseId);
            parameters.Add("ArticleId", request.ArticleId);
            parameters.Add("EuroSize", request.EuroSize);
            parameters.Add("MovementType", request.MovementType);
            parameters.Add("Direction", request.Direction);
            parameters.Add("Quantity", request.Quantity);
            parameters.Add("ReferenceType", request.ReferenceType);
            parameters.Add("ReferenceId", request.ReferenceId);
            parameters.Add("Notes", request.Notes);
            parameters.Add("CreatedBy", UserId);

            await conn.ExecuteAsync(
                "inventory.sp_StockMovement_Record",
                parameters,
                commandType: CommandType.StoredProcedure);

            var response = new StockMovementResponse
            {
                ArticleId = request.ArticleId,
                WarehouseId = request.WarehouseId,
                EuroSize = request.EuroSize,
                MovementType = request.MovementType,
                Direction = request.Direction,
                Quantity = request.Quantity,
                ReferenceType = request.ReferenceType,
                Notes = request.Notes,
                MovementDate = DateTime.UtcNow
            };

            return Ok(ApiResponse<StockMovementResponse>.Ok(response, "Stock movement recorded"));
        }
        catch (SqlException ex) when (ex.Message.Contains("CHECK constraint"))
        {
            return BadRequest(ApiResponse<StockMovementResponse>.Fail("Insufficient stock for outward movement"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording stock movement for article {ArticleId}", request.ArticleId);
            return StatusCode(500, ApiResponse<StockMovementResponse>.Fail("An error occurred while recording stock movement"));
        }
    }

    // ════════════════════════════════════════════════════════════
    //  GRN Endpoints
    // ════════════════════════════════════════════════════════════

    // ────────────────────────────────────────────────────────────
    // POST /api/stock/grn — Create a Goods Received Note (Draft)
    // ────────────────────────────────────────────────────────────
    [HttpPost("grn")]
    public async Task<ActionResult<ApiResponse<GRNResponse>>> CreateGRN(
        [FromBody] CreateGRNRequest request, CancellationToken ct)
    {
        try
        {
            if (request.Lines == null || !request.Lines.Any())
                return BadRequest(ApiResponse<GRNResponse>.Fail("GRN must have at least one line"));

            using var conn = CreateConnection();
            conn.Open();
            using var txn = conn.BeginTransaction();

            try
            {
                // Generate GRN number
                var grnNumberSql = @"
                    DECLARE @seq INT;
                    SELECT @seq = ISNULL(MAX(CAST(RIGHT(GRNNumber, 4) AS INT)), 0) + 1
                    FROM inventory.GoodsReceivedNotes
                    WHERE TenantId = @TenantId AND GRNNumber LIKE @Prefix + '%';
                    SELECT @Prefix + RIGHT('0000' + CAST(@seq AS VARCHAR(4)), 4);";

                var prefix = $"GRN-{DateTime.UtcNow:yyyyMM}-";
                var grnNumber = await conn.QuerySingleAsync<string>(grnNumberSql,
                    new { TenantId, Prefix = prefix }, txn);

                var grnId = Guid.NewGuid();
                var totalQty = request.Lines.Sum(l => l.Quantity);

                // Insert GRN header as Draft
                var insertGrn = @"
                    INSERT INTO inventory.GoodsReceivedNotes
                        (GRNId, TenantId, GRNNumber, WarehouseId, ReceiptDate, SourceType, ReferenceNo, Status, Notes, TotalQuantity, CreatedBy)
                    VALUES
                        (@GRNId, @TenantId, @GRNNumber, @WarehouseId, @ReceiptDate, @SourceType, @ReferenceNo, 'Draft', @Notes, @TotalQuantity, @CreatedBy);";

                await conn.ExecuteAsync(insertGrn, new
                {
                    GRNId = grnId,
                    TenantId,
                    GRNNumber = grnNumber,
                    request.WarehouseId,
                    ReceiptDate = request.ReceiptDate ?? DateTime.UtcNow,
                    SourceType = request.SourceType ?? "Purchase",
                    request.ReferenceNo,
                    request.Notes,
                    TotalQuantity = totalQty,
                    CreatedBy = UserId
                }, txn);

                // Insert each GRN line
                foreach (var line in request.Lines)
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO inventory.GRNLines (GRNLineId, GRNId, ArticleId, EuroSize, Quantity)
                        VALUES (NEWID(), @GRNId, @ArticleId, @EuroSize, @Quantity);",
                        new { GRNId = grnId, line.ArticleId, line.EuroSize, line.Quantity }, txn);
                }

                txn.Commit();

                var response = new GRNResponse
                {
                    GRNId = grnId,
                    GRNNumber = grnNumber,
                    WarehouseId = request.WarehouseId,
                    SourceType = request.SourceType ?? "Purchase",
                    ReferenceNo = request.ReferenceNo,
                    TotalQuantity = totalQty,
                    Status = "Draft",
                    LineCount = request.Lines.Count,
                    ReceiptDate = request.ReceiptDate ?? DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };

                return Ok(ApiResponse<GRNResponse>.Ok(response, "GRN created as draft"));
            }
            catch
            {
                txn.Rollback();
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating GRN for warehouse {WarehouseId}", request.WarehouseId);
            return StatusCode(500, ApiResponse<GRNResponse>.Fail("An error occurred while creating GRN"));
        }
    }

    // ────────────────────────────────────────────────────────────
    // GET /api/stock/grn — List GRNs with optional filters
    // ────────────────────────────────────────────────────────────
    [HttpGet("grn")]
    public async Task<ActionResult<ApiResponse<List<GRNListRow>>>> GetGRNs(
        [FromQuery] Guid? warehouseId, [FromQuery] string? status, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();

            var sql = @"
                SELECT
                    g.GRNId, g.GRNNumber, g.WarehouseId, g.ReceiptDate,
                    g.SourceType, g.ReferenceNo, g.Status, g.Notes,
                    g.TotalQuantity, g.CreatedAt, g.CreatedBy,
                    w.WarehouseName, w.WarehouseCode,
                    (SELECT COUNT(*) FROM inventory.GRNLines gl WHERE gl.GRNId = g.GRNId) AS LineCount
                FROM inventory.GoodsReceivedNotes g
                INNER JOIN warehouse.Warehouses w ON g.WarehouseId = w.WarehouseId
                WHERE g.TenantId = @TenantId
                    AND (@WarehouseId IS NULL OR g.WarehouseId = @WarehouseId)
                    AND (@Status IS NULL OR g.Status = @Status)
                ORDER BY g.CreatedAt DESC";

            var result = (await conn.QueryAsync<GRNListRow>(sql, new
            {
                TenantId,
                WarehouseId = warehouseId,
                Status = string.IsNullOrWhiteSpace(status) ? null : status
            })).ToList();

            return Ok(ApiResponse<List<GRNListRow>>.Ok(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving GRN list");
            return StatusCode(500, ApiResponse<List<GRNListRow>>.Fail("An error occurred while retrieving GRNs"));
        }
    }

    // ────────────────────────────────────────────────────────────
    // GET /api/stock/grn/{id} — Get GRN details with lines
    // ────────────────────────────────────────────────────────────
    [HttpGet("grn/{id:guid}")]
    public async Task<ActionResult<ApiResponse<GRNDetailResponse>>> GetGRN(Guid id, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();

            var sql = @"
                -- GRN header
                SELECT
                    g.GRNId, g.GRNNumber, g.WarehouseId, g.ReceiptDate,
                    g.SourceType, g.ReferenceNo, g.Status, g.Notes,
                    g.TotalQuantity, g.CreatedAt, g.UpdatedAt, g.CreatedBy,
                    w.WarehouseName, w.WarehouseCode
                FROM inventory.GoodsReceivedNotes g
                INNER JOIN warehouse.Warehouses w ON g.WarehouseId = w.WarehouseId
                WHERE g.GRNId = @GRNId AND g.TenantId = @TenantId;

                -- GRN lines with article info
                SELECT
                    gl.GRNLineId, gl.GRNId, gl.ArticleId, gl.EuroSize, gl.Quantity,
                    a.ArticleCode, a.ArticleName, a.Color, a.MRP
                FROM inventory.GRNLines gl
                INNER JOIN product.Articles a ON gl.ArticleId = a.ArticleId
                WHERE gl.GRNId = @GRNId
                ORDER BY a.ArticleCode, gl.EuroSize;";

            using var multi = await conn.QueryMultipleAsync(sql, new { GRNId = id, TenantId });

            var header = await multi.ReadSingleOrDefaultAsync<GRNDetailResponse>();
            if (header == null)
                return NotFound(ApiResponse<GRNDetailResponse>.Fail("GRN not found"));

            header.Lines = (await multi.ReadAsync<GRNLineDetailRow>()).ToList();

            return Ok(ApiResponse<GRNDetailResponse>.Ok(header));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving GRN {GRNId}", id);
            return StatusCode(500, ApiResponse<GRNDetailResponse>.Fail("An error occurred while retrieving GRN details"));
        }
    }

    // ────────────────────────────────────────────────────────────
    // POST /api/stock/grn/{id}/confirm — Confirm GRN and update stock
    // ────────────────────────────────────────────────────────────
    [HttpPost("grn/{id:guid}/confirm")]
    public async Task<ActionResult<ApiResponse<GRNResponse>>> ConfirmGRN(Guid id, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();
            conn.Open();
            using var txn = conn.BeginTransaction();

            try
            {
                // Fetch the GRN header
                var grn = await conn.QuerySingleOrDefaultAsync<dynamic>(
                    @"SELECT GRNId, GRNNumber, WarehouseId, Status, TotalQuantity, SourceType
                      FROM inventory.GoodsReceivedNotes
                      WHERE GRNId = @GRNId AND TenantId = @TenantId",
                    new { GRNId = id, TenantId }, txn);

                if (grn == null)
                    return NotFound(ApiResponse<GRNResponse>.Fail("GRN not found"));

                if ((string)grn.Status != "Draft")
                    return BadRequest(ApiResponse<GRNResponse>.Fail(
                        $"GRN can only be confirmed from Draft status. Current status: {grn.Status}"));

                // Update status to Confirmed
                await conn.ExecuteAsync(
                    @"UPDATE inventory.GoodsReceivedNotes
                      SET Status = 'Confirmed', UpdatedAt = SYSUTCDATETIME()
                      WHERE GRNId = @GRNId AND TenantId = @TenantId",
                    new { GRNId = id, TenantId }, txn);

                // Fetch GRN lines
                var lines = (await conn.QueryAsync<dynamic>(
                    @"SELECT GRNLineId, ArticleId, EuroSize, Quantity
                      FROM inventory.GRNLines
                      WHERE GRNId = @GRNId",
                    new { GRNId = id }, txn)).ToList();

                // Record stock inward movement for each line
                foreach (var line in lines)
                {
                    var mvtParams = new DynamicParameters();
                    mvtParams.Add("TenantId", TenantId);
                    mvtParams.Add("WarehouseId", (Guid)grn.WarehouseId);
                    mvtParams.Add("ArticleId", (Guid)line.ArticleId);
                    mvtParams.Add("EuroSize", (int?)line.EuroSize);
                    mvtParams.Add("MovementType", "PURCHASE");
                    mvtParams.Add("Direction", "INWARD");
                    mvtParams.Add("Quantity", (int)line.Quantity);
                    mvtParams.Add("ReferenceType", "GRN");
                    mvtParams.Add("ReferenceId", id);
                    mvtParams.Add("Notes", $"GRN confirmed: {grn.GRNNumber}");
                    mvtParams.Add("CreatedBy", UserId);

                    await conn.ExecuteAsync(
                        "inventory.sp_StockMovement_Record",
                        mvtParams,
                        txn,
                        commandType: CommandType.StoredProcedure);
                }

                txn.Commit();

                var response = new GRNResponse
                {
                    GRNId = id,
                    GRNNumber = (string)grn.GRNNumber,
                    WarehouseId = (Guid)grn.WarehouseId,
                    SourceType = (string)grn.SourceType,
                    TotalQuantity = (int)grn.TotalQuantity,
                    Status = "Confirmed",
                    LineCount = lines.Count
                };

                return Ok(ApiResponse<GRNResponse>.Ok(response, "GRN confirmed and stock updated"));
            }
            catch
            {
                txn.Rollback();
                throw;
            }
        }
        catch (Exception ex) when (ex is not BadRequestException)
        {
            _logger.LogError(ex, "Error confirming GRN {GRNId}", id);
            return StatusCode(500, ApiResponse<GRNResponse>.Fail("An error occurred while confirming GRN"));
        }
    }

    // ════════════════════════════════════════════════════════════
    //  Stock Freeze Endpoints
    // ════════════════════════════════════════════════════════════

    // ────────────────────────────────────────────────────────────
    // POST /api/stock/freeze — Freeze monthly stock
    // ────────────────────────────────────────────────────────────
    [HttpPost("freeze")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<StockFreezeResponse>>> FreezeStock(
        [FromBody] FreezeStockRequest request, CancellationToken ct)
    {
        try
        {
            if (request.FreezeMonth < 1 || request.FreezeMonth > 12)
                return BadRequest(ApiResponse<StockFreezeResponse>.Fail("FreezeMonth must be between 1 and 12"));
            if (request.FreezeYear < 2020 || request.FreezeYear > 2100)
                return BadRequest(ApiResponse<StockFreezeResponse>.Fail("FreezeYear must be between 2020 and 2100"));

            using var conn = CreateConnection();
            conn.Open();
            using var txn = conn.BeginTransaction();

            try
            {
                // Check if already frozen
                var existing = await conn.QuerySingleOrDefaultAsync<Guid?>(
                    @"SELECT FreezeId FROM inventory.StockFreezes
                      WHERE TenantId = @TenantId AND WarehouseId = @WarehouseId
                        AND FreezeMonth = @FreezeMonth AND FreezeYear = @FreezeYear AND Status = 'Frozen'",
                    new { TenantId, request.WarehouseId, request.FreezeMonth, request.FreezeYear }, txn);

                if (existing.HasValue)
                    return BadRequest(ApiResponse<StockFreezeResponse>.Fail(
                        $"Stock for {request.FreezeMonth:D2}/{request.FreezeYear} is already frozen for this warehouse"));

                var freezeId = Guid.NewGuid();

                // Insert freeze header
                await conn.ExecuteAsync(@"
                    INSERT INTO inventory.StockFreezes
                        (FreezeId, TenantId, WarehouseId, FreezeMonth, FreezeYear, Status, FrozenAt, FrozenBy)
                    VALUES
                        (@FreezeId, @TenantId, @WarehouseId, @FreezeMonth, @FreezeYear, 'Frozen', SYSUTCDATETIME(), @FrozenBy)",
                    new
                    {
                        FreezeId = freezeId,
                        TenantId,
                        request.WarehouseId,
                        request.FreezeMonth,
                        request.FreezeYear,
                        FrozenBy = UserId
                    }, txn);

                // Snapshot current stock into freeze lines with all 9 movement groups
                // Values are computed from movements during the freeze month and previous freeze closing
                await conn.ExecuteAsync(@"
                    ;WITH PrevFreeze AS (
                        SELECT fl.ArticleId, fl.EuroSize, fl.ClosingQty AS PrevClosingQty, fl.ClosingValue AS PrevClosingValue
                        FROM inventory.StockFreezeLines fl
                        INNER JOIN inventory.StockFreezes f ON fl.FreezeId = f.FreezeId
                        WHERE f.TenantId = @TenantId AND f.WarehouseId = @WarehouseId
                            AND f.FreezeMonth = @PrevMonth AND f.FreezeYear = @PrevYear
                            AND f.Status = 'Frozen'
                    ),
                    MonthMovements AS (
                        SELECT
                            sm.ArticleId, sm.EuroSize,
                            SUM(CASE WHEN sm.Direction = 'INWARD' AND sm.MovementType IN ('PURCHASE','PRODUCTION','OPENING') THEN sm.Quantity ELSE 0 END) AS ReceivedQty,
                            SUM(CASE WHEN sm.Direction = 'OUTWARD' AND sm.MovementType IN ('SALES','DISPATCH') THEN sm.Quantity ELSE 0 END) AS IssuedQty,
                            SUM(CASE WHEN sm.MovementType = 'RETURN' THEN sm.Quantity ELSE 0 END) AS ReturnQty,
                            SUM(CASE WHEN sm.MovementType = 'HANDLOAN_IN' THEN sm.Quantity ELSE 0 END) AS HandloanInQty,
                            SUM(CASE WHEN sm.MovementType = 'HANDLOAN_OUT' THEN sm.Quantity ELSE 0 END) AS HandloanOutQty,
                            SUM(CASE WHEN sm.MovementType = 'JOBWORK_IN' THEN sm.Quantity ELSE 0 END) AS JobworkInQty,
                            SUM(CASE WHEN sm.MovementType = 'JOBWORK_OUT' THEN sm.Quantity ELSE 0 END) AS JobworkOutQty
                        FROM inventory.StockMovements sm
                        WHERE sm.TenantId = @TenantId AND sm.WarehouseId = @WarehouseId
                            AND sm.MovementDate >= @MonthStart AND sm.MovementDate < @MonthEnd
                        GROUP BY sm.ArticleId, sm.EuroSize
                    ),
                    AllArticles AS (
                        SELECT ArticleId, EuroSize FROM inventory.StockLedger
                        WHERE TenantId = @TenantId AND WarehouseId = @WarehouseId
                        UNION
                        SELECT ArticleId, EuroSize FROM PrevFreeze
                        UNION
                        SELECT ArticleId, EuroSize FROM MonthMovements
                    )
                    INSERT INTO inventory.StockFreezeLines
                        (FreezeLineId, FreezeId, ArticleId, EuroSize,
                         OpeningQty, OpeningValue,
                         ReceivedQty, ReceivedValue,
                         IssuedQty, IssuedValue,
                         ReturnQty, ReturnValue,
                         HandloanInQty, HandloanInValue,
                         HandloanOutQty, HandloanOutValue,
                         JobworkInQty, JobworkInValue,
                         JobworkOutQty, JobworkOutValue,
                         ClosingQty, ClosingValue)
                    SELECT
                        NEWID(), @FreezeId, aa.ArticleId, aa.EuroSize,
                        ISNULL(pf.PrevClosingQty, 0),
                        ISNULL(pf.PrevClosingValue, 0),
                        ISNULL(mm.ReceivedQty, 0),
                        ISNULL(mm.ReceivedQty, 0) * ISNULL(a.MRP, 0),
                        ISNULL(mm.IssuedQty, 0),
                        ISNULL(mm.IssuedQty, 0) * ISNULL(a.MRP, 0),
                        ISNULL(mm.ReturnQty, 0),
                        ISNULL(mm.ReturnQty, 0) * ISNULL(a.MRP, 0),
                        ISNULL(mm.HandloanInQty, 0),
                        ISNULL(mm.HandloanInQty, 0) * ISNULL(a.MRP, 0),
                        ISNULL(mm.HandloanOutQty, 0),
                        ISNULL(mm.HandloanOutQty, 0) * ISNULL(a.MRP, 0),
                        ISNULL(mm.JobworkInQty, 0),
                        ISNULL(mm.JobworkInQty, 0) * ISNULL(a.MRP, 0),
                        ISNULL(mm.JobworkOutQty, 0),
                        ISNULL(mm.JobworkOutQty, 0) * ISNULL(a.MRP, 0),
                        -- Closing = Opening + Received - Issued + Return + HandloanIn - HandloanOut + JobworkIn - JobworkOut
                        ISNULL(pf.PrevClosingQty, 0) + ISNULL(mm.ReceivedQty, 0) - ISNULL(mm.IssuedQty, 0)
                            + ISNULL(mm.ReturnQty, 0) + ISNULL(mm.HandloanInQty, 0) - ISNULL(mm.HandloanOutQty, 0)
                            + ISNULL(mm.JobworkInQty, 0) - ISNULL(mm.JobworkOutQty, 0),
                        (ISNULL(pf.PrevClosingQty, 0) + ISNULL(mm.ReceivedQty, 0) - ISNULL(mm.IssuedQty, 0)
                            + ISNULL(mm.ReturnQty, 0) + ISNULL(mm.HandloanInQty, 0) - ISNULL(mm.HandloanOutQty, 0)
                            + ISNULL(mm.JobworkInQty, 0) - ISNULL(mm.JobworkOutQty, 0)) * ISNULL(a.MRP, 0)
                    FROM AllArticles aa
                    LEFT JOIN PrevFreeze pf ON aa.ArticleId = pf.ArticleId AND ISNULL(aa.EuroSize, 0) = ISNULL(pf.EuroSize, 0)
                    LEFT JOIN MonthMovements mm ON aa.ArticleId = mm.ArticleId AND ISNULL(aa.EuroSize, 0) = ISNULL(mm.EuroSize, 0)
                    LEFT JOIN product.Articles a ON aa.ArticleId = a.ArticleId",
                    new
                    {
                        FreezeId = freezeId,
                        TenantId,
                        request.WarehouseId,
                        PrevMonth = request.FreezeMonth == 1 ? 12 : request.FreezeMonth - 1,
                        PrevYear = request.FreezeMonth == 1 ? request.FreezeYear - 1 : request.FreezeYear,
                        MonthStart = new DateTime(request.FreezeYear, request.FreezeMonth, 1),
                        MonthEnd = new DateTime(request.FreezeYear, request.FreezeMonth, 1).AddMonths(1)
                    }, txn);

                // Roll forward: current closing becomes next month's opening
                await conn.ExecuteAsync(@"
                    UPDATE inventory.StockLedger
                    SET OpeningStock = ClosingStock,
                        InwardQty = 0,
                        OutwardQty = 0,
                        LastUpdated = SYSUTCDATETIME()
                    WHERE TenantId = @TenantId AND WarehouseId = @WarehouseId",
                    new { TenantId, request.WarehouseId }, txn);

                var frozenLines = await conn.QuerySingleAsync<int>(
                    "SELECT COUNT(*) FROM inventory.StockFreezeLines WHERE FreezeId = @FreezeId",
                    new { FreezeId = freezeId }, txn);

                txn.Commit();

                var response = new StockFreezeResponse
                {
                    FreezeId = freezeId,
                    WarehouseId = request.WarehouseId,
                    FreezeMonth = request.FreezeMonth,
                    FreezeYear = request.FreezeYear,
                    Status = "Frozen",
                    FrozenLineCount = frozenLines,
                    FrozenAt = DateTime.UtcNow
                };

                return Ok(ApiResponse<StockFreezeResponse>.Ok(response,
                    $"Stock frozen for {request.FreezeMonth:D2}/{request.FreezeYear}. " +
                    $"{frozenLines} article-size combinations captured. Opening stock rolled forward."));
            }
            catch
            {
                txn.Rollback();
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error freezing stock for {Month}/{Year}", request.FreezeMonth, request.FreezeYear);
            return StatusCode(500, ApiResponse<StockFreezeResponse>.Fail("An error occurred while freezing stock"));
        }
    }

    // ────────────────────────────────────────────────────────────
    // GET /api/stock/freeze — Get stock freezes with filters
    // ────────────────────────────────────────────────────────────
    [HttpGet("freeze")]
    public async Task<ActionResult<ApiResponse<List<StockFreezeListRow>>>> GetStockFreezes(
        [FromQuery] Guid? warehouseId, [FromQuery] int? year, [FromQuery] int? month,
        [FromQuery] string? status, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();

            var sql = @"
                SELECT
                    f.FreezeId, f.WarehouseId, f.FreezeMonth, f.FreezeYear,
                    f.Status, f.FrozenAt, f.FrozenBy, f.CreatedAt,
                    w.WarehouseName, w.WarehouseCode,
                    (SELECT COUNT(*) FROM inventory.StockFreezeLines fl WHERE fl.FreezeId = f.FreezeId) AS LineCount,
                    (SELECT SUM(fl.ClosingQty) FROM inventory.StockFreezeLines fl WHERE fl.FreezeId = f.FreezeId) AS TotalClosingQty,
                    (SELECT SUM(fl.ClosingValue) FROM inventory.StockFreezeLines fl WHERE fl.FreezeId = f.FreezeId) AS TotalClosingValue
                FROM inventory.StockFreezes f
                INNER JOIN warehouse.Warehouses w ON f.WarehouseId = w.WarehouseId
                WHERE f.TenantId = @TenantId
                    AND (@WarehouseId IS NULL OR f.WarehouseId = @WarehouseId)
                    AND (@Year IS NULL OR f.FreezeYear = @Year)
                    AND (@Month IS NULL OR f.FreezeMonth = @Month)
                    AND (@Status IS NULL OR f.Status = @Status)
                ORDER BY f.FreezeYear DESC, f.FreezeMonth DESC";

            var result = (await conn.QueryAsync<StockFreezeListRow>(sql, new
            {
                TenantId,
                WarehouseId = warehouseId,
                Year = year,
                Month = month,
                Status = string.IsNullOrWhiteSpace(status) ? null : status
            })).ToList();

            return Ok(ApiResponse<List<StockFreezeListRow>>.Ok(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving stock freezes");
            return StatusCode(500, ApiResponse<List<StockFreezeListRow>>.Fail("An error occurred while retrieving stock freezes"));
        }
    }

    // ────────────────────────────────────────────────────────────
    // GET /api/stock/freeze/history — Get freeze history
    // ────────────────────────────────────────────────────────────
    [HttpGet("freeze/history")]
    public async Task<ActionResult<ApiResponse<List<StockFreezeHistoryRow>>>> GetStockFreezeHistory(
        [FromQuery] Guid? warehouseId, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();

            var sql = @"
                SELECT
                    f.FreezeId, f.WarehouseId, f.FreezeMonth, f.FreezeYear,
                    f.Status, f.FrozenAt, f.FrozenBy,
                    w.WarehouseName, w.WarehouseCode,
                    (SELECT COUNT(*) FROM inventory.StockFreezeLines fl WHERE fl.FreezeId = f.FreezeId) AS LineCount,
                    (SELECT SUM(fl.ClosingQty) FROM inventory.StockFreezeLines fl WHERE fl.FreezeId = f.FreezeId) AS TotalClosingQty,
                    (SELECT SUM(fl.ClosingValue) FROM inventory.StockFreezeLines fl WHERE fl.FreezeId = f.FreezeId) AS TotalClosingValue
                FROM inventory.StockFreezes f
                INNER JOIN warehouse.Warehouses w ON f.WarehouseId = w.WarehouseId
                WHERE f.TenantId = @TenantId AND f.Status = 'Frozen'
                    AND (@WarehouseId IS NULL OR f.WarehouseId = @WarehouseId)
                ORDER BY f.FreezeYear DESC, f.FreezeMonth DESC";

            var result = (await conn.QueryAsync<StockFreezeHistoryRow>(sql, new
            {
                TenantId,
                WarehouseId = warehouseId
            })).ToList();

            return Ok(ApiResponse<List<StockFreezeHistoryRow>>.Ok(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving stock freeze history");
            return StatusCode(500, ApiResponse<List<StockFreezeHistoryRow>>.Fail("An error occurred while retrieving freeze history"));
        }
    }

    // ════════════════════════════════════════════════════════════
    //  Dispatch Endpoints
    // ════════════════════════════════════════════════════════════

    // GET /api/stock/dispatch
    [HttpGet("dispatch")]
    public async Task<ActionResult<ApiResponse<PagedResult<DispatchListRow>>>> GetDispatches(
        [FromQuery] string? search, [FromQuery] Guid? warehouseId, [FromQuery] string? status,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 25, CancellationToken ct = default)
    {
        try
        {
            using var conn = CreateConnection();
            var sql = @"
                SELECT d.DispatchId, d.DispatchNumber, d.DispatchDate, d.Status,
                       d.ReferenceOrderNo, d.TransportMode, d.VehicleNo, d.LogisticsPartner,
                       d.TotalQuantity, d.CreatedAt,
                       w.WarehouseName, w.WarehouseCode,
                       c.ClientName, s.StoreName,
                       (SELECT COUNT(*) FROM inventory.DispatchLines dl WHERE dl.DispatchId = d.DispatchId) AS LineCount
                FROM inventory.Dispatches d
                INNER JOIN warehouse.Warehouses w ON d.WarehouseId = w.WarehouseId
                LEFT JOIN sales.Clients c ON d.ClientId = c.ClientId
                LEFT JOIN sales.Stores s ON d.StoreId = s.StoreId
                WHERE d.TenantId = @TenantId
                  AND (@WarehouseId IS NULL OR d.WarehouseId = @WarehouseId)
                  AND (@Status IS NULL OR d.Status = @Status)
                  AND (@Search IS NULL OR d.DispatchNumber LIKE '%'+@Search+'%'
                       OR c.ClientName LIKE '%'+@Search+'%'
                       OR w.WarehouseName LIKE '%'+@Search+'%')
                ORDER BY d.CreatedAt DESC
                OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

                SELECT COUNT(*) FROM inventory.Dispatches d
                LEFT JOIN sales.Clients c ON d.ClientId = c.ClientId
                LEFT JOIN warehouse.Warehouses w ON d.WarehouseId = w.WarehouseId
                WHERE d.TenantId = @TenantId
                  AND (@WarehouseId IS NULL OR d.WarehouseId = @WarehouseId)
                  AND (@Status IS NULL OR d.Status = @Status)
                  AND (@Search IS NULL OR d.DispatchNumber LIKE '%'+@Search+'%'
                       OR c.ClientName LIKE '%'+@Search+'%'
                       OR w.WarehouseName LIKE '%'+@Search+'%');";

            using var multi = await conn.QueryMultipleAsync(sql, new {
                TenantId, WarehouseId = warehouseId,
                Status = string.IsNullOrWhiteSpace(status) ? null : status,
                Search = string.IsNullOrWhiteSpace(search) ? null : search,
                PageNumber = pageNumber > 0 ? pageNumber : 1,
                PageSize = Math.Min(pageSize > 0 ? pageSize : 25, 100)
            });
            var items = (await multi.ReadAsync<DispatchListRow>()).ToList();
            var total = await multi.ReadSingleAsync<int>();
            return Ok(ApiResponse<PagedResult<DispatchListRow>>.Ok(new PagedResult<DispatchListRow>
                { Items = items, TotalCount = total, PageNumber = pageNumber, PageSize = pageSize }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving dispatches");
            return StatusCode(500, ApiResponse<PagedResult<DispatchListRow>>.Fail("Error retrieving dispatches"));
        }
    }

    // POST /api/stock/dispatch
    [HttpPost("dispatch")]
    public async Task<ActionResult<ApiResponse<DispatchResponse>>> CreateDispatch(
        [FromBody] CreateDispatchRequest request, CancellationToken ct)
    {
        if (request.Lines == null || !request.Lines.Any())
            return BadRequest(ApiResponse<DispatchResponse>.Fail("Dispatch must have at least one line"));

        try
        {
            using var conn = CreateConnection();
            conn.Open();
            using var txn = conn.BeginTransaction();
            try
            {
                // Generate dispatch number
                var prefix = $"DSP-{DateTime.UtcNow:yyyyMM}-";
                var dispatchNumber = await conn.QuerySingleAsync<string>(@"
                    DECLARE @seq INT;
                    SELECT @seq = ISNULL(MAX(CAST(RIGHT(DispatchNumber,4) AS INT)),0)+1
                    FROM inventory.Dispatches WHERE TenantId=@TenantId AND DispatchNumber LIKE @Prefix+'%';
                    SELECT @Prefix+RIGHT('0000'+CAST(@seq AS VARCHAR(4)),4);",
                    new { TenantId, Prefix = prefix }, txn);

                var dispatchId = Guid.NewGuid();
                var totalQty = request.Lines.Sum(l => l.Quantity);

                await conn.ExecuteAsync(@"
                    INSERT INTO inventory.Dispatches
                        (DispatchId,TenantId,DispatchNumber,WarehouseId,ClientId,StoreId,
                         DispatchDate,ReferenceOrderNo,TransportMode,VehicleNo,LogisticsPartner,
                         Status,TotalQuantity,Notes,CreatedBy)
                    VALUES
                        (@DispatchId,@TenantId,@DispatchNumber,@WarehouseId,@ClientId,@StoreId,
                         @DispatchDate,@ReferenceOrderNo,@TransportMode,@VehicleNo,@LogisticsPartner,
                         'Dispatched',@TotalQuantity,@Notes,@CreatedBy);",
                    new { DispatchId = dispatchId, TenantId, DispatchNumber = dispatchNumber,
                        request.WarehouseId, ClientId = request.ClientId,
                        StoreId = (object?)request.StoreId ?? DBNull.Value,
                        DispatchDate = request.DispatchDate ?? DateTime.UtcNow,
                        ReferenceOrderNo = request.ReferenceOrderNo,
                        TransportMode = request.TransportMode,
                        VehicleNo = request.VehicleNo,
                        LogisticsPartner = request.LogisticsPartner,
                        TotalQuantity = totalQty, Notes = request.Notes,
                        CreatedBy = UserId }, txn);

                foreach (var line in request.Lines)
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO inventory.DispatchLines(DispatchLineId,DispatchId,ArticleId,EuroSize,Quantity)
                        VALUES(NEWID(),@DispatchId,@ArticleId,@EuroSize,@Quantity);",
                        new { DispatchId = dispatchId, line.ArticleId, line.EuroSize, line.Quantity }, txn);

                    // Record OUTWARD stock movement
                    var mvtParams = new DynamicParameters();
                    mvtParams.Add("TenantId", TenantId);
                    mvtParams.Add("WarehouseId", request.WarehouseId);
                    mvtParams.Add("ArticleId", line.ArticleId);
                    mvtParams.Add("EuroSize", line.EuroSize);
                    mvtParams.Add("MovementType", "DISPATCH");
                    mvtParams.Add("Direction", "OUTWARD");
                    mvtParams.Add("Quantity", line.Quantity);
                    mvtParams.Add("ReferenceType", "DISPATCH");
                    mvtParams.Add("ReferenceId", dispatchId);
                    mvtParams.Add("Notes", $"Dispatch: {dispatchNumber}");
                    mvtParams.Add("CreatedBy", UserId);
                    await conn.ExecuteAsync("inventory.sp_StockMovement_Record", mvtParams, txn, commandType: System.Data.CommandType.StoredProcedure);
                }

                txn.Commit();
                return Ok(ApiResponse<DispatchResponse>.Ok(new DispatchResponse {
                    DispatchId = dispatchId, DispatchNumber = dispatchNumber,
                    Status = "Dispatched", TotalQuantity = totalQty, CreatedAt = DateTime.UtcNow
                }, "Dispatch created successfully"));
            }
            catch { txn.Rollback(); throw; }
        }
        catch (SqlException ex) when (ex.Message.Contains("CHECK constraint") || ex.Message.Contains("Insufficient"))
        {
            return BadRequest(ApiResponse<DispatchResponse>.Fail("Insufficient stock for one or more items"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating dispatch");
            return StatusCode(500, ApiResponse<DispatchResponse>.Fail("Error creating dispatch"));
        }
    }

    // GET /api/stock/dispatch/{id}
    [HttpGet("dispatch/{id:guid}")]
    public async Task<ActionResult<ApiResponse<DispatchDetailResponse>>> GetDispatch(Guid id, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();
            var sql = @"
                SELECT d.DispatchId, d.DispatchNumber, d.DispatchDate, d.Status,
                       d.ReferenceOrderNo, d.TransportMode, d.VehicleNo, d.LogisticsPartner,
                       d.TotalQuantity, d.Notes, d.CreatedAt,
                       w.WarehouseName, c.ClientName, s.StoreName
                FROM inventory.Dispatches d
                INNER JOIN warehouse.Warehouses w ON d.WarehouseId = w.WarehouseId
                LEFT JOIN sales.Clients c ON d.ClientId = c.ClientId
                LEFT JOIN sales.Stores s ON d.StoreId = s.StoreId
                WHERE d.DispatchId = @DispatchId AND d.TenantId = @TenantId;

                SELECT dl.DispatchLineId, dl.ArticleId, dl.EuroSize, dl.Quantity,
                       a.ArticleCode, a.ArticleName, a.Color
                FROM inventory.DispatchLines dl
                INNER JOIN product.Articles a ON dl.ArticleId = a.ArticleId
                WHERE dl.DispatchId = @DispatchId ORDER BY a.ArticleCode, dl.EuroSize;";

            using var multi = await conn.QueryMultipleAsync(sql, new { DispatchId = id, TenantId });
            var header = await multi.ReadSingleOrDefaultAsync<DispatchDetailResponse>();
            if (header == null) return NotFound(ApiResponse<DispatchDetailResponse>.Fail("Dispatch not found"));
            header.Lines = (await multi.ReadAsync<DispatchLineRow>()).ToList();
            return Ok(ApiResponse<DispatchDetailResponse>.Ok(header));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving dispatch {DispatchId}", id);
            return StatusCode(500, ApiResponse<DispatchDetailResponse>.Fail("Error retrieving dispatch"));
        }
    }

    // ════════════════════════════════════════════════════════════
    //  Returns Endpoints
    // ════════════════════════════════════════════════════════════

    // GET /api/stock/returns
    [HttpGet("returns")]
    public async Task<ActionResult<ApiResponse<PagedResult<ReturnListRow>>>> GetReturns(
        [FromQuery] string? search, [FromQuery] Guid? warehouseId, [FromQuery] string? status,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 25, CancellationToken ct = default)
    {
        try
        {
            using var conn = CreateConnection();
            var sql = @"
                SELECT r.ReturnId, r.ReturnNumber, r.ReturnDate, r.Status, r.Reason,
                       r.TotalQuantity, r.Notes, r.CreatedAt,
                       w.WarehouseName, c.ClientName, s.StoreName,
                       (SELECT COUNT(*) FROM inventory.ReturnLines rl WHERE rl.ReturnId = r.ReturnId) AS LineCount
                FROM inventory.StockReturns r
                INNER JOIN warehouse.Warehouses w ON r.WarehouseId = w.WarehouseId
                LEFT JOIN sales.Clients c ON r.ClientId = c.ClientId
                LEFT JOIN sales.Stores s ON r.StoreId = s.StoreId
                WHERE r.TenantId = @TenantId
                  AND (@WarehouseId IS NULL OR r.WarehouseId = @WarehouseId)
                  AND (@Status IS NULL OR r.Status = @Status)
                  AND (@Search IS NULL OR r.ReturnNumber LIKE '%'+@Search+'%'
                       OR c.ClientName LIKE '%'+@Search+'%')
                ORDER BY r.CreatedAt DESC
                OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

                SELECT COUNT(*) FROM inventory.StockReturns r
                LEFT JOIN sales.Clients c ON r.ClientId = c.ClientId
                WHERE r.TenantId = @TenantId
                  AND (@WarehouseId IS NULL OR r.WarehouseId = @WarehouseId)
                  AND (@Status IS NULL OR r.Status = @Status)
                  AND (@Search IS NULL OR r.ReturnNumber LIKE '%'+@Search+'%'
                       OR c.ClientName LIKE '%'+@Search+'%');";

            using var multi = await conn.QueryMultipleAsync(sql, new {
                TenantId, WarehouseId = warehouseId,
                Status = string.IsNullOrWhiteSpace(status) ? null : status,
                Search = string.IsNullOrWhiteSpace(search) ? null : search,
                PageNumber = pageNumber > 0 ? pageNumber : 1,
                PageSize = Math.Min(pageSize > 0 ? pageSize : 25, 100)
            });
            var items = (await multi.ReadAsync<ReturnListRow>()).ToList();
            var total = await multi.ReadSingleAsync<int>();
            return Ok(ApiResponse<PagedResult<ReturnListRow>>.Ok(new PagedResult<ReturnListRow>
                { Items = items, TotalCount = total, PageNumber = pageNumber, PageSize = pageSize }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving returns");
            return StatusCode(500, ApiResponse<PagedResult<ReturnListRow>>.Fail("Error retrieving returns"));
        }
    }

    // POST /api/stock/returns
    [HttpPost("returns")]
    public async Task<ActionResult<ApiResponse<ReturnResponse>>> CreateReturn(
        [FromBody] CreateReturnRequest request, CancellationToken ct)
    {
        if (request.Lines == null || !request.Lines.Any())
            return BadRequest(ApiResponse<ReturnResponse>.Fail("Return must have at least one line"));
        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest(ApiResponse<ReturnResponse>.Fail("Reason is required"));

        try
        {
            using var conn = CreateConnection();
            conn.Open();
            using var txn = conn.BeginTransaction();
            try
            {
                var prefix = $"RET-{DateTime.UtcNow:yyyyMM}-";
                var returnNumber = await conn.QuerySingleAsync<string>(@"
                    DECLARE @seq INT;
                    SELECT @seq = ISNULL(MAX(CAST(RIGHT(ReturnNumber,4) AS INT)),0)+1
                    FROM inventory.StockReturns WHERE TenantId=@TenantId AND ReturnNumber LIKE @Prefix+'%';
                    SELECT @Prefix+RIGHT('0000'+CAST(@seq AS VARCHAR(4)),4);",
                    new { TenantId, Prefix = prefix }, txn);

                var returnId = Guid.NewGuid();
                var totalQty = request.Lines.Sum(l => l.Quantity);

                await conn.ExecuteAsync(@"
                    INSERT INTO inventory.StockReturns
                        (ReturnId,TenantId,ReturnNumber,WarehouseId,ClientId,StoreId,
                         ReturnDate,Reason,Status,TotalQuantity,Notes,CreatedBy)
                    VALUES
                        (@ReturnId,@TenantId,@ReturnNumber,@WarehouseId,@ClientId,@StoreId,
                         @ReturnDate,@Reason,'Received',@TotalQuantity,@Notes,@CreatedBy);",
                    new { ReturnId = returnId, TenantId, ReturnNumber = returnNumber,
                        request.WarehouseId, ClientId = request.ClientId,
                        StoreId = (object?)request.StoreId ?? DBNull.Value,
                        ReturnDate = request.ReturnDate ?? DateTime.UtcNow,
                        request.Reason, TotalQuantity = totalQty, Notes = request.Notes,
                        CreatedBy = UserId }, txn);

                foreach (var line in request.Lines)
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO inventory.ReturnLines(ReturnLineId,ReturnId,ArticleId,EuroSize,Quantity)
                        VALUES(NEWID(),@ReturnId,@ArticleId,@EuroSize,@Quantity);",
                        new { ReturnId = returnId, line.ArticleId, line.EuroSize, line.Quantity }, txn);

                    // Record INWARD stock movement
                    var mvtParams = new DynamicParameters();
                    mvtParams.Add("TenantId", TenantId);
                    mvtParams.Add("WarehouseId", request.WarehouseId);
                    mvtParams.Add("ArticleId", line.ArticleId);
                    mvtParams.Add("EuroSize", line.EuroSize);
                    mvtParams.Add("MovementType", "RETURN");
                    mvtParams.Add("Direction", "INWARD");
                    mvtParams.Add("Quantity", line.Quantity);
                    mvtParams.Add("ReferenceType", "RETURN");
                    mvtParams.Add("ReferenceId", returnId);
                    mvtParams.Add("Notes", $"Return: {returnNumber} - {request.Reason}");
                    mvtParams.Add("CreatedBy", UserId);
                    await conn.ExecuteAsync("inventory.sp_StockMovement_Record", mvtParams, txn, commandType: System.Data.CommandType.StoredProcedure);
                }

                txn.Commit();
                return Ok(ApiResponse<ReturnResponse>.Ok(new ReturnResponse {
                    ReturnId = returnId, ReturnNumber = returnNumber,
                    Status = "Received", TotalQuantity = totalQty, CreatedAt = DateTime.UtcNow
                }, "Return recorded successfully"));
            }
            catch { txn.Rollback(); throw; }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating return");
            return StatusCode(500, ApiResponse<ReturnResponse>.Fail("Error creating return"));
        }
    }

    // PUT /api/stock/returns/{id}/status
    [HttpPut("returns/{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<string>>> UpdateReturnStatus(Guid id, [FromBody] UpdateStatusRequest req, CancellationToken ct)
    {
        var validStatuses = new[] { "Received", "Inspected", "Restocked", "Rejected" };
        if (!validStatuses.Contains(req.Status))
            return BadRequest(ApiResponse<string>.Fail($"Invalid status. Valid: {string.Join(", ", validStatuses)}"));
        try
        {
            using var conn = CreateConnection();
            var affected = await conn.ExecuteAsync(@"
                UPDATE inventory.StockReturns SET Status=@Status, UpdatedAt=SYSUTCDATETIME()
                WHERE ReturnId=@ReturnId AND TenantId=@TenantId;",
                new { ReturnId = id, TenantId, req.Status });
            if (affected == 0) return NotFound(ApiResponse<string>.Fail("Return not found"));
            return Ok(ApiResponse<string>.Ok(req.Status, $"Return status updated to {req.Status}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating return status {ReturnId}", id);
            return StatusCode(500, ApiResponse<string>.Fail("Error updating return status"));
        }
    }

    // ════════════════════════════════════════════════════════════
    //  Stock Adjustment Endpoints (with status flow)
    // ════════════════════════════════════════════════════════════

    // GET /api/stock/adjustments
    [HttpGet("adjustments")]
    public async Task<ActionResult<ApiResponse<PagedResult<AdjustmentListRow>>>> GetAdjustments(
        [FromQuery] string? search, [FromQuery] Guid? warehouseId, [FromQuery] string? status,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 25, CancellationToken ct = default)
    {
        try
        {
            using var conn = CreateConnection();
            var sql = @"
                SELECT a.AdjustmentId, a.AdjustmentNumber, a.AdjustmentDate, a.AdjustmentType,
                       a.Reason, a.Status, a.TotalQuantity, a.Notes, a.CreatedAt,
                       a.ApprovedAt, a.AppliedAt,
                       w.WarehouseName,
                       (SELECT COUNT(*) FROM inventory.StockAdjustmentLines al WHERE al.AdjustmentId = a.AdjustmentId) AS LineCount
                FROM inventory.StockAdjustments a
                INNER JOIN warehouse.Warehouses w ON a.WarehouseId = w.WarehouseId
                WHERE a.TenantId = @TenantId
                  AND (@WarehouseId IS NULL OR a.WarehouseId = @WarehouseId)
                  AND (@Status IS NULL OR a.Status = @Status)
                  AND (@Search IS NULL OR a.AdjustmentNumber LIKE '%'+@Search+'%'
                       OR a.Reason LIKE '%'+@Search+'%')
                ORDER BY a.CreatedAt DESC
                OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

                SELECT COUNT(*) FROM inventory.StockAdjustments a
                WHERE a.TenantId=@TenantId
                  AND (@WarehouseId IS NULL OR a.WarehouseId=@WarehouseId)
                  AND (@Status IS NULL OR a.Status=@Status)
                  AND (@Search IS NULL OR a.AdjustmentNumber LIKE '%'+@Search+'%' OR a.Reason LIKE '%'+@Search+'%');";

            using var multi = await conn.QueryMultipleAsync(sql, new {
                TenantId, WarehouseId = warehouseId,
                Status = string.IsNullOrWhiteSpace(status) ? null : status,
                Search = string.IsNullOrWhiteSpace(search) ? null : search,
                PageNumber = pageNumber > 0 ? pageNumber : 1,
                PageSize = Math.Min(pageSize > 0 ? pageSize : 25, 100)
            });
            var items = (await multi.ReadAsync<AdjustmentListRow>()).ToList();
            var total = await multi.ReadSingleAsync<int>();
            return Ok(ApiResponse<PagedResult<AdjustmentListRow>>.Ok(new PagedResult<AdjustmentListRow>
                { Items = items, TotalCount = total, PageNumber = pageNumber, PageSize = pageSize }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving adjustments");
            return StatusCode(500, ApiResponse<PagedResult<AdjustmentListRow>>.Fail("Error retrieving adjustments"));
        }
    }

    // POST /api/stock/adjustments
    [HttpPost("adjustments")]
    public async Task<ActionResult<ApiResponse<AdjustmentResponse>>> CreateAdjustment(
        [FromBody] CreateAdjustmentRequest request, CancellationToken ct)
    {
        if (request.Lines == null || !request.Lines.Any())
            return BadRequest(ApiResponse<AdjustmentResponse>.Fail("Adjustment must have at least one line"));

        try
        {
            using var conn = CreateConnection();
            conn.Open();
            using var txn = conn.BeginTransaction();
            try
            {
                var prefix = $"ADJ-{DateTime.UtcNow:yyyyMM}-";
                var adjNumber = await conn.QuerySingleAsync<string>(@"
                    DECLARE @seq INT;
                    SELECT @seq = ISNULL(MAX(CAST(RIGHT(AdjustmentNumber,4) AS INT)),0)+1
                    FROM inventory.StockAdjustments WHERE TenantId=@TenantId AND AdjustmentNumber LIKE @Prefix+'%';
                    SELECT @Prefix+RIGHT('0000'+CAST(@seq AS VARCHAR(4)),4);",
                    new { TenantId, Prefix = prefix }, txn);

                var adjId = Guid.NewGuid();
                var totalQty = request.Lines.Sum(l => l.Quantity);

                await conn.ExecuteAsync(@"
                    INSERT INTO inventory.StockAdjustments
                        (AdjustmentId,TenantId,AdjustmentNumber,WarehouseId,AdjustmentDate,
                         AdjustmentType,Reason,Status,TotalQuantity,Notes,CreatedBy)
                    VALUES
                        (@AdjustmentId,@TenantId,@AdjustmentNumber,@WarehouseId,@AdjustmentDate,
                         @AdjustmentType,@Reason,'Draft',@TotalQuantity,@Notes,@CreatedBy);",
                    new { AdjustmentId = adjId, TenantId, AdjustmentNumber = adjNumber,
                        request.WarehouseId, AdjustmentDate = DateTime.UtcNow,
                        AdjustmentType = request.AdjustmentType ?? "Add",
                        request.Reason, TotalQuantity = totalQty, Notes = request.Notes,
                        CreatedBy = UserId }, txn);

                foreach (var line in request.Lines)
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO inventory.StockAdjustmentLines(AdjustmentLineId,AdjustmentId,ArticleId,EuroSize,Quantity)
                        VALUES(NEWID(),@AdjustmentId,@ArticleId,@EuroSize,@Quantity);",
                        new { AdjustmentId = adjId, line.ArticleId, line.EuroSize, line.Quantity }, txn);
                }

                txn.Commit();
                return Ok(ApiResponse<AdjustmentResponse>.Ok(new AdjustmentResponse {
                    AdjustmentId = adjId, AdjustmentNumber = adjNumber,
                    Status = "Draft", TotalQuantity = totalQty, CreatedAt = DateTime.UtcNow
                }, "Adjustment created as Draft — pending approval"));
            }
            catch { txn.Rollback(); throw; }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating adjustment");
            return StatusCode(500, ApiResponse<AdjustmentResponse>.Fail("Error creating adjustment"));
        }
    }

    // PUT /api/stock/adjustments/{id}/approve
    [HttpPut("adjustments/{id:guid}/approve")]
    public async Task<ActionResult<ApiResponse<string>>> ApproveAdjustment(Guid id, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();
            var affected = await conn.ExecuteAsync(@"
                UPDATE inventory.StockAdjustments
                SET Status='Approved', ApprovedBy=@ApprovedBy, ApprovedAt=SYSUTCDATETIME(), UpdatedAt=SYSUTCDATETIME()
                WHERE AdjustmentId=@AdjId AND TenantId=@TenantId AND Status='Draft';",
                new { AdjId = id, TenantId, ApprovedBy = UserId });
            if (affected == 0) return BadRequest(ApiResponse<string>.Fail("Adjustment not found or not in Draft status"));
            return Ok(ApiResponse<string>.Ok("Approved", "Adjustment approved"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving adjustment {AdjId}", id);
            return StatusCode(500, ApiResponse<string>.Fail("Error approving adjustment"));
        }
    }

    // PUT /api/stock/adjustments/{id}/reject
    [HttpPut("adjustments/{id:guid}/reject")]
    public async Task<ActionResult<ApiResponse<string>>> RejectAdjustment(Guid id, [FromBody] RejectRequest req, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();
            var affected = await conn.ExecuteAsync(@"
                UPDATE inventory.StockAdjustments
                SET Status='Rejected', RejectedBy=@RejectedBy, RejectedAt=SYSUTCDATETIME(),
                    RejectionReason=@Reason, UpdatedAt=SYSUTCDATETIME()
                WHERE AdjustmentId=@AdjId AND TenantId=@TenantId AND Status='Draft';",
                new { AdjId = id, TenantId, RejectedBy = UserId, Reason = req.Reason });
            if (affected == 0) return BadRequest(ApiResponse<string>.Fail("Adjustment not found or not in Draft status"));
            return Ok(ApiResponse<string>.Ok("Rejected", "Adjustment rejected"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting adjustment {AdjId}", id);
            return StatusCode(500, ApiResponse<string>.Fail("Error rejecting adjustment"));
        }
    }

    // POST /api/stock/adjustments/{id}/apply
    [HttpPost("adjustments/{id:guid}/apply")]
    public async Task<ActionResult<ApiResponse<string>>> ApplyAdjustment(Guid id, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();
            conn.Open();
            using var txn = conn.BeginTransaction();
            try
            {
                var adj = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                    SELECT AdjustmentId, AdjustmentNumber, WarehouseId, AdjustmentType, Status
                    FROM inventory.StockAdjustments
                    WHERE AdjustmentId=@AdjId AND TenantId=@TenantId;",
                    new { AdjId = id, TenantId }, txn);

                if (adj == null) return NotFound(ApiResponse<string>.Fail("Adjustment not found"));
                if ((string)adj.Status != "Approved")
                    return BadRequest(ApiResponse<string>.Fail("Only Approved adjustments can be applied"));

                var lines = (await conn.QueryAsync<dynamic>(@"
                    SELECT ArticleId, EuroSize, Quantity FROM inventory.StockAdjustmentLines
                    WHERE AdjustmentId=@AdjId;",
                    new { AdjId = id }, txn)).ToList();

                foreach (var line in lines)
                {
                    var mvtParams = new DynamicParameters();
                    mvtParams.Add("TenantId", TenantId);
                    mvtParams.Add("WarehouseId", (Guid)adj.WarehouseId);
                    mvtParams.Add("ArticleId", (Guid)line.ArticleId);
                    mvtParams.Add("EuroSize", (string?)line.EuroSize);
                    mvtParams.Add("MovementType", "ADJUSTMENT");
                    mvtParams.Add("Direction", (string)adj.AdjustmentType == "Add" ? "INWARD" : "OUTWARD");
                    mvtParams.Add("Quantity", (int)line.Quantity);
                    mvtParams.Add("ReferenceType", "ADJUSTMENT");
                    mvtParams.Add("ReferenceId", id);
                    mvtParams.Add("Notes", $"Stock Adjustment: {adj.AdjustmentNumber}");
                    mvtParams.Add("CreatedBy", UserId);
                    await conn.ExecuteAsync("inventory.sp_StockMovement_Record", mvtParams, txn, commandType: System.Data.CommandType.StoredProcedure);
                }

                await conn.ExecuteAsync(@"
                    UPDATE inventory.StockAdjustments
                    SET Status='Applied', AppliedAt=SYSUTCDATETIME(), UpdatedAt=SYSUTCDATETIME()
                    WHERE AdjustmentId=@AdjId AND TenantId=@TenantId;",
                    new { AdjId = id, TenantId }, txn);

                txn.Commit();
                return Ok(ApiResponse<string>.Ok("Applied", "Adjustment applied to stock"));
            }
            catch { txn.Rollback(); throw; }
        }
        catch (SqlException ex) when (ex.Message.Contains("Insufficient") || ex.Message.Contains("CHECK"))
        {
            return BadRequest(ApiResponse<string>.Fail("Insufficient stock for adjustment"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying adjustment {AdjId}", id);
            return StatusCode(500, ApiResponse<string>.Fail("Error applying adjustment"));
        }
    }

    // ════════════════════════════════════════════════════════════
    //  Stock Ledger / Reporting Endpoints
    // ════════════════════════════════════════════════════════════

    // ────────────────────────────────────────────────────────────
    // GET /api/stock/ledger — Get stock ledger with all 9 movement
    //   groups (Opening, Received, Issued, Return, HandloanIn/Out,
    //   JobworkIn/Out, Closing). Returns frozen data if available,
    //   otherwise computes live from movements.
    // ────────────────────────────────────────────────────────────
    [HttpGet("ledger")]
    public async Task<ActionResult<ApiResponse<List<StockLedgerRow>>>> GetStockLedger(
        [FromQuery] StockLedgerQueryParams query, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();

            var targetMonth = query.Month ?? DateTime.UtcNow.Month;
            var targetYear = query.Year ?? DateTime.UtcNow.Year;

            // First, check if frozen data exists for the requested period
            var frozenSql = @"
                SELECT
                    fl.ArticleId, fl.EuroSize,
                    f.WarehouseId, f.FreezeMonth AS [Month], f.FreezeYear AS [Year],
                    w.WarehouseName, w.WarehouseCode,
                    a.ArticleCode, a.ArticleName, a.Color,
                    fl.OpeningQty, fl.OpeningValue,
                    fl.ReceivedQty, fl.ReceivedValue,
                    fl.IssuedQty, fl.IssuedValue,
                    fl.ReturnQty, fl.ReturnValue,
                    fl.HandloanInQty, fl.HandloanInValue,
                    fl.HandloanOutQty, fl.HandloanOutValue,
                    fl.JobworkInQty, fl.JobworkInValue,
                    fl.JobworkOutQty, fl.JobworkOutValue,
                    fl.ClosingQty, fl.ClosingValue,
                    CAST(1 AS BIT) AS IsFrozen
                FROM inventory.StockFreezeLines fl
                INNER JOIN inventory.StockFreezes f ON fl.FreezeId = f.FreezeId
                INNER JOIN warehouse.Warehouses w ON f.WarehouseId = w.WarehouseId
                LEFT JOIN product.Articles a ON fl.ArticleId = a.ArticleId
                WHERE f.TenantId = @TenantId
                    AND f.FreezeMonth = @Month AND f.FreezeYear = @Year
                    AND f.Status = 'Frozen'
                    AND (@WarehouseId IS NULL OR f.WarehouseId = @WarehouseId)
                    AND (@ArticleId IS NULL OR fl.ArticleId = @ArticleId)
                ORDER BY w.WarehouseName, a.ArticleCode, fl.EuroSize";

            var frozenResult = (await conn.QueryAsync<StockLedgerRow>(frozenSql, new
            {
                TenantId,
                Month = targetMonth,
                Year = targetYear,
                WarehouseId = query.WarehouseId,
                ArticleId = query.ArticleId
            })).ToList();

            if (frozenResult.Any())
                return Ok(ApiResponse<List<StockLedgerRow>>.Ok(frozenResult));

            // No frozen data; compute live ledger from movements
            var liveSql = @"
                ;WITH PrevFreeze AS (
                    SELECT f.WarehouseId, fl.ArticleId, fl.EuroSize,
                           fl.ClosingQty AS PrevClosingQty, fl.ClosingValue AS PrevClosingValue
                    FROM inventory.StockFreezeLines fl
                    INNER JOIN inventory.StockFreezes f ON fl.FreezeId = f.FreezeId
                    WHERE f.TenantId = @TenantId
                        AND f.FreezeMonth = @PrevMonth AND f.FreezeYear = @PrevYear
                        AND f.Status = 'Frozen'
                        AND (@WarehouseId IS NULL OR f.WarehouseId = @WarehouseId)
                ),
                MonthMovements AS (
                    SELECT
                        sm.WarehouseId, sm.ArticleId, sm.EuroSize,
                        SUM(CASE WHEN sm.Direction = 'INWARD' AND sm.MovementType IN ('PURCHASE','PRODUCTION','OPENING') THEN sm.Quantity ELSE 0 END) AS ReceivedQty,
                        SUM(CASE WHEN sm.Direction = 'OUTWARD' AND sm.MovementType IN ('SALES','DISPATCH') THEN sm.Quantity ELSE 0 END) AS IssuedQty,
                        SUM(CASE WHEN sm.MovementType = 'RETURN' THEN sm.Quantity ELSE 0 END) AS ReturnQty,
                        SUM(CASE WHEN sm.MovementType = 'HANDLOAN_IN' THEN sm.Quantity ELSE 0 END) AS HandloanInQty,
                        SUM(CASE WHEN sm.MovementType = 'HANDLOAN_OUT' THEN sm.Quantity ELSE 0 END) AS HandloanOutQty,
                        SUM(CASE WHEN sm.MovementType = 'JOBWORK_IN' THEN sm.Quantity ELSE 0 END) AS JobworkInQty,
                        SUM(CASE WHEN sm.MovementType = 'JOBWORK_OUT' THEN sm.Quantity ELSE 0 END) AS JobworkOutQty
                    FROM inventory.StockMovements sm
                    WHERE sm.TenantId = @TenantId
                        AND sm.MovementDate >= @MonthStart AND sm.MovementDate < @MonthEnd
                        AND (@WarehouseId IS NULL OR sm.WarehouseId = @WarehouseId)
                        AND (@ArticleId IS NULL OR sm.ArticleId = @ArticleId)
                    GROUP BY sm.WarehouseId, sm.ArticleId, sm.EuroSize
                ),
                AllArticles AS (
                    SELECT WarehouseId, ArticleId, EuroSize FROM PrevFreeze
                    UNION
                    SELECT WarehouseId, ArticleId, EuroSize FROM MonthMovements
                )
                SELECT
                    aa.ArticleId, aa.EuroSize,
                    aa.WarehouseId, @Month AS [Month], @Year AS [Year],
                    w.WarehouseName, w.WarehouseCode,
                    a.ArticleCode, a.ArticleName, a.Color,
                    ISNULL(pf.PrevClosingQty, 0) AS OpeningQty,
                    ISNULL(pf.PrevClosingValue, 0) AS OpeningValue,
                    ISNULL(mm.ReceivedQty, 0) AS ReceivedQty,
                    ISNULL(mm.ReceivedQty, 0) * ISNULL(a.MRP, 0) AS ReceivedValue,
                    ISNULL(mm.IssuedQty, 0) AS IssuedQty,
                    ISNULL(mm.IssuedQty, 0) * ISNULL(a.MRP, 0) AS IssuedValue,
                    ISNULL(mm.ReturnQty, 0) AS ReturnQty,
                    ISNULL(mm.ReturnQty, 0) * ISNULL(a.MRP, 0) AS ReturnValue,
                    ISNULL(mm.HandloanInQty, 0) AS HandloanInQty,
                    ISNULL(mm.HandloanInQty, 0) * ISNULL(a.MRP, 0) AS HandloanInValue,
                    ISNULL(mm.HandloanOutQty, 0) AS HandloanOutQty,
                    ISNULL(mm.HandloanOutQty, 0) * ISNULL(a.MRP, 0) AS HandloanOutValue,
                    ISNULL(mm.JobworkInQty, 0) AS JobworkInQty,
                    ISNULL(mm.JobworkInQty, 0) * ISNULL(a.MRP, 0) AS JobworkInValue,
                    ISNULL(mm.JobworkOutQty, 0) AS JobworkOutQty,
                    ISNULL(mm.JobworkOutQty, 0) * ISNULL(a.MRP, 0) AS JobworkOutValue,
                    ISNULL(pf.PrevClosingQty, 0) + ISNULL(mm.ReceivedQty, 0) - ISNULL(mm.IssuedQty, 0)
                        + ISNULL(mm.ReturnQty, 0) + ISNULL(mm.HandloanInQty, 0) - ISNULL(mm.HandloanOutQty, 0)
                        + ISNULL(mm.JobworkInQty, 0) - ISNULL(mm.JobworkOutQty, 0) AS ClosingQty,
                    (ISNULL(pf.PrevClosingQty, 0) + ISNULL(mm.ReceivedQty, 0) - ISNULL(mm.IssuedQty, 0)
                        + ISNULL(mm.ReturnQty, 0) + ISNULL(mm.HandloanInQty, 0) - ISNULL(mm.HandloanOutQty, 0)
                        + ISNULL(mm.JobworkInQty, 0) - ISNULL(mm.JobworkOutQty, 0)) * ISNULL(a.MRP, 0) AS ClosingValue,
                    CAST(0 AS BIT) AS IsFrozen
                FROM AllArticles aa
                LEFT JOIN PrevFreeze pf ON aa.WarehouseId = pf.WarehouseId
                    AND aa.ArticleId = pf.ArticleId AND ISNULL(aa.EuroSize, 0) = ISNULL(pf.EuroSize, 0)
                LEFT JOIN MonthMovements mm ON aa.WarehouseId = mm.WarehouseId
                    AND aa.ArticleId = mm.ArticleId AND ISNULL(aa.EuroSize, 0) = ISNULL(mm.EuroSize, 0)
                INNER JOIN warehouse.Warehouses w ON aa.WarehouseId = w.WarehouseId
                LEFT JOIN product.Articles a ON aa.ArticleId = a.ArticleId
                ORDER BY w.WarehouseName, a.ArticleCode, aa.EuroSize";

            var prevMonth = targetMonth == 1 ? 12 : targetMonth - 1;
            var prevYear = targetMonth == 1 ? targetYear - 1 : targetYear;

            var liveResult = (await conn.QueryAsync<StockLedgerRow>(liveSql, new
            {
                TenantId,
                Month = targetMonth,
                Year = targetYear,
                PrevMonth = prevMonth,
                PrevYear = prevYear,
                MonthStart = new DateTime(targetYear, targetMonth, 1),
                MonthEnd = new DateTime(targetYear, targetMonth, 1).AddMonths(1),
                WarehouseId = query.WarehouseId,
                ArticleId = query.ArticleId
            })).ToList();

            return Ok(ApiResponse<List<StockLedgerRow>>.Ok(liveResult));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving stock ledger");
            return StatusCode(500, ApiResponse<List<StockLedgerRow>>.Fail("An error occurred while retrieving the stock ledger"));
        }
    }
}

// ══════════════════════════════════════════════════════════════
// Exception type for handled bad requests (filter in catch)
// ══════════════════════════════════════════════════════════════
public class BadRequestException : Exception
{
    public BadRequestException(string message) : base(message) { }
}

// ══════════════════════════════════════════════════════════════
// Query Parameter Models
// ══════════════════════════════════════════════════════════════

public class StockQueryParams
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 25;
    public string? Search { get; set; }
    public Guid? WarehouseId { get; set; }
}

public class StockLedgerQueryParams
{
    public Guid? WarehouseId { get; set; }
    public Guid? ArticleId { get; set; }
    public int? Month { get; set; }
    public int? Year { get; set; }
}

// ══════════════════════════════════════════════════════════════
// Request Models
// ══════════════════════════════════════════════════════════════

public class RecordStockMovementRequest
{
    public Guid ArticleId { get; set; }
    public Guid WarehouseId { get; set; }
    public int? EuroSize { get; set; }
    public string MovementType { get; set; } = string.Empty;    // OPENING, PURCHASE, PRODUCTION, SALES, RETURN, ADJUSTMENT, HANDLOAN_IN, HANDLOAN_OUT, JOBWORK_IN, JOBWORK_OUT
    public string Direction { get; set; } = string.Empty;       // INWARD, OUTWARD
    public int Quantity { get; set; }
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }
    public string? Notes { get; set; }
}

public class CreateGRNRequest
{
    public Guid WarehouseId { get; set; }
    public DateTime? ReceiptDate { get; set; }
    public string? SourceType { get; set; }     // Purchase, Production, Return, Transfer
    public string? ReferenceNo { get; set; }
    public string? Notes { get; set; }
    public List<GRNLineRequest> Lines { get; set; } = new();
}

public class GRNLineRequest
{
    public Guid ArticleId { get; set; }
    public int? EuroSize { get; set; }
    public int Quantity { get; set; }
}

public class FreezeStockRequest
{
    public Guid WarehouseId { get; set; }
    public int FreezeMonth { get; set; }
    public int FreezeYear { get; set; }
}

// ══════════════════════════════════════════════════════════════
// Response DTOs — Stock Overview
// ══════════════════════════════════════════════════════════════

public class StockListRow
{
    public Guid StockLedgerId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid ArticleId { get; set; }
    public int? EuroSize { get; set; }
    public int OpeningStock { get; set; }
    public int InwardQty { get; set; }
    public int OutwardQty { get; set; }
    public int ClosingStock { get; set; }
    public DateTime LastUpdated { get; set; }
    public string ArticleCode { get; set; } = string.Empty;
    public string ArticleName { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string HSNCode { get; set; } = string.Empty;
    public decimal MRP { get; set; }
    public string UOM { get; set; } = string.Empty;
    public bool IsSizeBased { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public string? BrandName { get; set; }
    public string? SegmentName { get; set; }
    public string? GenderName { get; set; }
}

// ══════════════════════════════════════════════════════════════
// Response DTOs — Article Size Stock
// ══════════════════════════════════════════════════════════════

/// <summary>
/// CRITICAL: Size-wise stock response for the order entry screen.
/// Returns article metadata plus per-size opening/inward/outward/closing quantities.
/// </summary>
public class ArticleSizeStockResponse
{
    public Guid ArticleId { get; set; }
    public string ArticleCode { get; set; } = string.Empty;
    public string ArticleName { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string HsnCode { get; set; } = string.Empty;
    public decimal Mrp { get; set; }
    public string Uom { get; set; } = string.Empty;
    public string? BrandName { get; set; }
    public string? SegmentName { get; set; }
    public string? GenderName { get; set; }
    public bool IsSizeBased { get; set; }
    public List<SizeStockRow> SizeStock { get; set; } = new();
}

public class SizeStockRow
{
    public int EuroSize { get; set; }
    public int OpeningStock { get; set; }
    public int InwardQty { get; set; }
    public int OutwardQty { get; set; }
    public int ClosingStock { get; set; }
    public DateTime? LastUpdated { get; set; }
}

public class ArticleHeaderRow
{
    public Guid ArticleId { get; set; }
    public string ArticleCode { get; set; } = string.Empty;
    public string ArticleName { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string HSNCode { get; set; } = string.Empty;
    public decimal MRP { get; set; }
    public string UOM { get; set; } = string.Empty;
    public bool IsSizeBased { get; set; }
    public string? BrandName { get; set; }
    public string? SegmentName { get; set; }
    public string? GenderName { get; set; }
}

// ══════════════════════════════════════════════════════════════
// Response DTOs — Stock Movement
// ══════════════════════════════════════════════════════════════

public class StockMovementResponse
{
    public Guid ArticleId { get; set; }
    public Guid WarehouseId { get; set; }
    public int? EuroSize { get; set; }
    public string MovementType { get; set; } = string.Empty;
    public string Direction { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string? ReferenceType { get; set; }
    public string? Notes { get; set; }
    public DateTime MovementDate { get; set; }
}

// ══════════════════════════════════════════════════════════════
// Response DTOs — GRN
// ══════════════════════════════════════════════════════════════

public class GRNResponse
{
    public Guid GRNId { get; set; }
    public string GRNNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public string? ReferenceNo { get; set; }
    public int TotalQuantity { get; set; }
    public string Status { get; set; } = string.Empty;
    public int LineCount { get; set; }
    public DateTime? ReceiptDate { get; set; }
    public DateTime? CreatedAt { get; set; }
}

public class GRNListRow
{
    public Guid GRNId { get; set; }
    public string GRNNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateTime ReceiptDate { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public string? ReferenceNo { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public int TotalQuantity { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public int LineCount { get; set; }
}

public class GRNDetailResponse
{
    public Guid GRNId { get; set; }
    public string GRNNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateTime ReceiptDate { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public string? ReferenceNo { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public int TotalQuantity { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public List<GRNLineDetailRow> Lines { get; set; } = new();
}

public class GRNLineDetailRow
{
    public Guid GRNLineId { get; set; }
    public Guid GRNId { get; set; }
    public Guid ArticleId { get; set; }
    public int? EuroSize { get; set; }
    public int Quantity { get; set; }
    public string ArticleCode { get; set; } = string.Empty;
    public string ArticleName { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public decimal MRP { get; set; }
}

// ══════════════════════════════════════════════════════════════
// Response DTOs — Stock Freeze
// ══════════════════════════════════════════════════════════════

public class StockFreezeResponse
{
    public Guid FreezeId { get; set; }
    public Guid WarehouseId { get; set; }
    public int FreezeMonth { get; set; }
    public int FreezeYear { get; set; }
    public string Status { get; set; } = string.Empty;
    public int FrozenLineCount { get; set; }
    public DateTime FrozenAt { get; set; }
}

public class StockFreezeListRow
{
    public Guid FreezeId { get; set; }
    public Guid WarehouseId { get; set; }
    public int FreezeMonth { get; set; }
    public int FreezeYear { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? FrozenAt { get; set; }
    public Guid? FrozenBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public int LineCount { get; set; }
    public int? TotalClosingQty { get; set; }
    public decimal? TotalClosingValue { get; set; }
}

public class StockFreezeHistoryRow
{
    public Guid FreezeId { get; set; }
    public Guid WarehouseId { get; set; }
    public int FreezeMonth { get; set; }
    public int FreezeYear { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? FrozenAt { get; set; }
    public Guid? FrozenBy { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public int LineCount { get; set; }
    public int? TotalClosingQty { get; set; }
    public decimal? TotalClosingValue { get; set; }
}

// ══════════════════════════════════════════════════════════════
// Response DTOs — Stock Ledger (with all 9 movement groups)
// ══════════════════════════════════════════════════════════════

public class StockLedgerRow
{
    public Guid ArticleId { get; set; }
    public int? EuroSize { get; set; }
    public Guid WarehouseId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public string ArticleCode { get; set; } = string.Empty;
    public string ArticleName { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;

    // 1. Opening
    public int OpeningQty { get; set; }
    public decimal OpeningValue { get; set; }

    // 2. Received
    public int ReceivedQty { get; set; }
    public decimal ReceivedValue { get; set; }

    // 3. Issued
    public int IssuedQty { get; set; }
    public decimal IssuedValue { get; set; }

    // 4. Return
    public int ReturnQty { get; set; }
    public decimal ReturnValue { get; set; }

    // 5. Handloan In
    public int HandloanInQty { get; set; }
    public decimal HandloanInValue { get; set; }

    // 6. Handloan Out
    public int HandloanOutQty { get; set; }
    public decimal HandloanOutValue { get; set; }

    // 7. Jobwork In
    public int JobworkInQty { get; set; }
    public decimal JobworkInValue { get; set; }

    // 8. Jobwork Out
    public int JobworkOutQty { get; set; }
    public decimal JobworkOutValue { get; set; }

    // 9. Closing
    public int ClosingQty { get; set; }
    public decimal ClosingValue { get; set; }

    public bool IsFrozen { get; set; }
}

// ══════════════════════════════════════════════════════════════
// DTOs — Dispatch
// ══════════════════════════════════════════════════════════════

public record DispatchListRow(Guid DispatchId, string DispatchNumber, DateTime DispatchDate, string Status,
    string? ReferenceOrderNo, string? TransportMode, string? VehicleNo, string? LogisticsPartner,
    int TotalQuantity, int LineCount, DateTime CreatedAt, string WarehouseName, string? ClientName, string? StoreName);

public record DispatchDetailResponse
{
    public Guid DispatchId { get; set; }
    public string DispatchNumber { get; set; } = "";
    public DateTime DispatchDate { get; set; }
    public string Status { get; set; } = "";
    public string? ReferenceOrderNo { get; set; }
    public string? TransportMode { get; set; }
    public string? VehicleNo { get; set; }
    public string? LogisticsPartner { get; set; }
    public int TotalQuantity { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public string WarehouseName { get; set; } = "";
    public string? ClientName { get; set; }
    public string? StoreName { get; set; }
    public List<DispatchLineRow> Lines { get; set; } = new();
}

public record DispatchLineRow(Guid DispatchLineId, Guid ArticleId, string? EuroSize, int Quantity, string ArticleCode, string ArticleName, string? Color);

public record DispatchResponse
{
    public Guid DispatchId { get; set; }
    public string DispatchNumber { get; set; } = "";
    public string Status { get; set; } = "";
    public int TotalQuantity { get; set; }
    public DateTime CreatedAt { get; set; }
}

public record CreateDispatchRequest
{
    public Guid WarehouseId { get; set; }
    public Guid? ClientId { get; set; }
    public Guid? StoreId { get; set; }
    public DateTime? DispatchDate { get; set; }
    public string? ReferenceOrderNo { get; set; }
    public string? TransportMode { get; set; }
    public string? VehicleNo { get; set; }
    public string? LogisticsPartner { get; set; }
    public string? Notes { get; set; }
    public List<DispatchLineRequest> Lines { get; set; } = new();
}

public record DispatchLineRequest
{
    public Guid ArticleId { get; set; }
    public string? EuroSize { get; set; }
    public int Quantity { get; set; }
}

// ══════════════════════════════════════════════════════════════
// DTOs — Returns
// ══════════════════════════════════════════════════════════════

public record ReturnListRow(Guid ReturnId, string ReturnNumber, DateTime ReturnDate, string Status, string Reason,
    int TotalQuantity, int LineCount, DateTime CreatedAt, string WarehouseName, string? ClientName, string? StoreName);

public record ReturnResponse
{
    public Guid ReturnId { get; set; }
    public string ReturnNumber { get; set; } = "";
    public string Status { get; set; } = "";
    public int TotalQuantity { get; set; }
    public DateTime CreatedAt { get; set; }
}

public record CreateReturnRequest
{
    public Guid WarehouseId { get; set; }
    public Guid? ClientId { get; set; }
    public Guid? StoreId { get; set; }
    public DateTime? ReturnDate { get; set; }
    public string Reason { get; set; } = "";
    public string? Notes { get; set; }
    public List<ReturnLineRequest> Lines { get; set; } = new();
}

public record ReturnLineRequest
{
    public Guid ArticleId { get; set; }
    public string? EuroSize { get; set; }
    public int Quantity { get; set; }
}

// ══════════════════════════════════════════════════════════════
// DTOs — Stock Adjustments
// ══════════════════════════════════════════════════════════════

public record AdjustmentListRow(Guid AdjustmentId, string AdjustmentNumber, DateTime AdjustmentDate,
    string AdjustmentType, string Reason, string Status, int TotalQuantity, int LineCount,
    DateTime CreatedAt, DateTime? ApprovedAt, DateTime? AppliedAt, string WarehouseName);

public record AdjustmentResponse
{
    public Guid AdjustmentId { get; set; }
    public string AdjustmentNumber { get; set; } = "";
    public string Status { get; set; } = "";
    public int TotalQuantity { get; set; }
    public DateTime CreatedAt { get; set; }
}

public record CreateAdjustmentRequest
{
    public Guid WarehouseId { get; set; }
    public string? AdjustmentType { get; set; } // Add or Remove
    public string Reason { get; set; } = "";
    public string? Notes { get; set; }
    public List<AdjustmentLineRequest> Lines { get; set; } = new();
}

public record AdjustmentLineRequest
{
    public Guid ArticleId { get; set; }
    public string? EuroSize { get; set; }
    public int Quantity { get; set; }
}

public record RejectRequest { public string Reason { get; set; } = ""; }

public record UpdateStatusRequest { public string Status { get; set; } = ""; }
