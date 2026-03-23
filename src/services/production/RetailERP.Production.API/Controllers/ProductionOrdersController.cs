using System.Data;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Production.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductionOrdersController : ControllerBase
{
    private readonly string _connectionString;
    private readonly ILogger<ProductionOrdersController> _logger;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public ProductionOrdersController(IConfiguration configuration, ILogger<ProductionOrdersController> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        _logger = logger;
    }

    private IDbConnection CreateConnection() => new SqlConnection(_connectionString);

    // ================================================================
    // GET /api/productionorders -- List production orders (paginated)
    // ================================================================
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<ProductionOrderListDto>>>> GetAll(
        [FromQuery] ProductionQueryParams query, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();

            var sql = @"
                SELECT
                    po.ProductionOrderId, po.OrderNo, po.OrderDate,
                    a.ArticleCode, a.ArticleName, po.Color,
                    po.OrderType, po.TotalQuantity, po.Status,
                    po.CreatedAt
                FROM production.ProductionOrders po
                INNER JOIN product.Articles a ON po.ArticleId = a.ArticleId
                WHERE po.TenantId = @TenantId
                    AND (@Status IS NULL OR po.Status = @Status)
                    AND (@Search IS NULL
                         OR po.OrderNo LIKE '%' + @Search + '%'
                         OR a.ArticleName LIKE '%' + @Search + '%'
                         OR a.ArticleCode LIKE '%' + @Search + '%')
                    AND (@FromDate IS NULL OR po.OrderDate >= @FromDate)
                    AND (@ToDate IS NULL OR po.OrderDate <= @ToDate)
                ORDER BY po.OrderDate DESC, po.CreatedAt DESC
                OFFSET (@Page - 1) * @PageSize ROWS
                FETCH NEXT @PageSize ROWS ONLY;

                SELECT COUNT(*)
                FROM production.ProductionOrders po
                INNER JOIN product.Articles a ON po.ArticleId = a.ArticleId
                WHERE po.TenantId = @TenantId
                    AND (@Status IS NULL OR po.Status = @Status)
                    AND (@Search IS NULL
                         OR po.OrderNo LIKE '%' + @Search + '%'
                         OR a.ArticleName LIKE '%' + @Search + '%'
                         OR a.ArticleCode LIKE '%' + @Search + '%')
                    AND (@FromDate IS NULL OR po.OrderDate >= @FromDate)
                    AND (@ToDate IS NULL OR po.OrderDate <= @ToDate);";

            var page = query.Page > 0 ? query.Page : 1;
            var pageSize = query.PageSize > 0 ? Math.Min(query.PageSize, 100) : 25;

            using var multi = await conn.QueryMultipleAsync(sql, new
            {
                TenantId,
                Status = string.IsNullOrWhiteSpace(query.Status) ? null : query.Status,
                Search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search,
                FromDate = query.FromDate,
                ToDate = query.ToDate,
                Page = page,
                PageSize = pageSize
            });

            var items = (await multi.ReadAsync<ProductionOrderListDto>()).ToList();
            var totalCount = await multi.ReadSingleAsync<int>();

            var result = new PagedResult<ProductionOrderListDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = page,
                PageSize = pageSize
            };

            return Ok(ApiResponse<PagedResult<ProductionOrderListDto>>.Ok(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing production orders");
            throw;
        }
    }

    // ================================================================
    // GET /api/productionorders/{id} -- Get production order with size runs
    // ================================================================
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProductionOrderDetailDto>>> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();
            var order = await GetProductionOrderById(conn, id);
            return Ok(ApiResponse<ProductionOrderDetailDto>.Ok(order));
        }
        catch (KeyNotFoundException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving production order {ProductionOrderId}", id);
            throw;
        }
    }

    // ================================================================
    // POST /api/productionorders -- Create production order with size-wise quantities
    // Body:
    //   { articleId, color, orderType, orderDate, notes,
    //     last, upperLeather, liningLeather, sole,
    //     sizeRuns: [{ euroSize, quantity }] }
    // ================================================================
    [HttpPost]
    public async Task<ActionResult<ApiResponse<ProductionOrderDetailDto>>> Create(
        [FromBody] CreateProductionOrderRequest request, CancellationToken ct)
    {
        if (request.SizeRuns == null || !request.SizeRuns.Any())
            throw new ArgumentException("Production order must have at least one size run");

        if (request.SizeRuns.Any(sr => sr.Quantity <= 0))
            throw new ArgumentException("All size quantities must be greater than zero");

        try
        {
            using var conn = CreateConnection();
            conn.Open();
            using var txn = conn.BeginTransaction();

            try
            {
                var orderNo = await GenerateProductionOrderNo(conn, txn);
                var orderId = Guid.NewGuid();
                var totalQty = request.SizeRuns.Sum(sr => sr.Quantity);

                await conn.ExecuteAsync(@"
                    INSERT INTO production.ProductionOrders
                        (ProductionOrderId, TenantId, OrderNo, OrderDate, ArticleId, GroupId, Color,
                         Last, UpperLeather, LiningLeather, Sole,
                         OrderType, TotalQuantity, Status,
                         UpperCuttingDies, MaterialCuttingDies, SocksInsoleCuttingDies,
                         Notes, CreatedBy)
                    VALUES
                        (@ProductionOrderId, @TenantId, @OrderNo, @OrderDate, @ArticleId, @GroupId, @Color,
                         @Last, @UpperLeather, @LiningLeather, @Sole,
                         @OrderType, @TotalQuantity, 'DRAFT',
                         @UpperCuttingDies, @MaterialCuttingDies, @SocksInsoleCuttingDies,
                         @Notes, @CreatedBy)",
                    new
                    {
                        ProductionOrderId = orderId,
                        TenantId,
                        OrderNo = orderNo,
                        OrderDate = request.OrderDate != default ? request.OrderDate : DateTime.UtcNow,
                        request.ArticleId,
                        request.GroupId,
                        request.Color,
                        request.Last,
                        request.UpperLeather,
                        request.LiningLeather,
                        request.Sole,
                        OrderType = request.OrderType ?? "REPLENISHMENT",
                        TotalQuantity = totalQty,
                        request.UpperCuttingDies,
                        request.MaterialCuttingDies,
                        request.SocksInsoleCuttingDies,
                        request.Notes,
                        CreatedBy = UserId
                    }, txn);

                foreach (var sr in request.SizeRuns)
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO production.ProductionSizeRuns
                            (SizeRunId, ProductionOrderId, EuroSize, Quantity, ProducedQty)
                        VALUES
                            (NEWID(), @ProductionOrderId, @EuroSize, @Quantity, 0)",
                        new { ProductionOrderId = orderId, sr.EuroSize, sr.Quantity }, txn);
                }

                txn.Commit();

                var order = await GetProductionOrderById(conn, orderId);
                return CreatedAtAction(nameof(GetById), new { id = orderId },
                    ApiResponse<ProductionOrderDetailDto>.Ok(order, "Production order created"));
            }
            catch
            {
                txn.Rollback();
                throw;
            }
        }
        catch (ArgumentException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating production order");
            throw;
        }
    }

    // ================================================================
    // PUT /api/productionorders/{id} -- Update a Draft production order
    // ================================================================
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProductionOrderDetailDto>>> Update(
        Guid id, [FromBody] CreateProductionOrderRequest request, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();
            conn.Open();
            using var txn = conn.BeginTransaction();

            try
            {
                var status = await conn.QuerySingleOrDefaultAsync<string>(
                    "SELECT Status FROM production.ProductionOrders WHERE ProductionOrderId = @Id AND TenantId = @TenantId",
                    new { Id = id, TenantId }, txn);

                if (status == null) throw new KeyNotFoundException("Production order not found");
                if (status != "DRAFT")
                    throw new InvalidOperationException(
                        $"Only DRAFT production orders can be updated. Current status: {status}");

                var totalQty = request.SizeRuns.Sum(sr => sr.Quantity);

                await conn.ExecuteAsync(@"
                    UPDATE production.ProductionOrders
                    SET ArticleId = @ArticleId, GroupId = @GroupId, Color = @Color,
                        OrderDate = @OrderDate, OrderType = @OrderType,
                        Last = @Last, UpperLeather = @UpperLeather,
                        LiningLeather = @LiningLeather, Sole = @Sole,
                        UpperCuttingDies = @UpperCuttingDies,
                        MaterialCuttingDies = @MaterialCuttingDies,
                        SocksInsoleCuttingDies = @SocksInsoleCuttingDies,
                        TotalQuantity = @TotalQuantity, Notes = @Notes,
                        UpdatedAt = SYSUTCDATETIME()
                    WHERE ProductionOrderId = @Id AND TenantId = @TenantId",
                    new
                    {
                        Id = id,
                        TenantId,
                        request.ArticleId,
                        request.GroupId,
                        request.Color,
                        OrderDate = request.OrderDate != default ? request.OrderDate : DateTime.UtcNow,
                        OrderType = request.OrderType ?? "REPLENISHMENT",
                        request.Last,
                        request.UpperLeather,
                        request.LiningLeather,
                        request.Sole,
                        request.UpperCuttingDies,
                        request.MaterialCuttingDies,
                        request.SocksInsoleCuttingDies,
                        TotalQuantity = totalQty,
                        request.Notes
                    }, txn);

                // Replace size runs
                await conn.ExecuteAsync(
                    "DELETE FROM production.ProductionSizeRuns WHERE ProductionOrderId = @Id",
                    new { Id = id }, txn);

                foreach (var sr in request.SizeRuns)
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO production.ProductionSizeRuns
                            (SizeRunId, ProductionOrderId, EuroSize, Quantity, ProducedQty)
                        VALUES (NEWID(), @Id, @EuroSize, @Quantity, 0)",
                        new { Id = id, sr.EuroSize, sr.Quantity }, txn);
                }

                txn.Commit();

                var order = await GetProductionOrderById(conn, id);
                return Ok(ApiResponse<ProductionOrderDetailDto>.Ok(order, "Production order updated"));
            }
            catch
            {
                txn.Rollback();
                throw;
            }
        }
        catch (KeyNotFoundException)
        {
            throw;
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating production order {ProductionOrderId}", id);
            throw;
        }
    }

    // ================================================================
    // POST /api/productionorders/{id}/approve -- Approve a Draft order
    // ================================================================
    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<ProductionOrderDetailDto>>> Approve(Guid id, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();
            var status = await conn.QuerySingleOrDefaultAsync<string>(
                "SELECT Status FROM production.ProductionOrders WHERE ProductionOrderId = @Id AND TenantId = @TenantId",
                new { Id = id, TenantId });

            if (status == null) throw new KeyNotFoundException("Production order not found");
            if (status != "DRAFT")
                throw new InvalidOperationException(
                    $"Only DRAFT orders can be approved. Current status: {status}");

            await conn.ExecuteAsync(@"
                UPDATE production.ProductionOrders
                SET Status = 'APPROVED', ApprovedBy = @ApprovedBy, ApprovedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
                WHERE ProductionOrderId = @Id AND TenantId = @TenantId",
                new { Id = id, TenantId, ApprovedBy = UserId });

            var order = await GetProductionOrderById(conn, id);
            return Ok(ApiResponse<ProductionOrderDetailDto>.Ok(order, "Production order approved"));
        }
        catch (KeyNotFoundException)
        {
            throw;
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving production order {ProductionOrderId}", id);
            throw;
        }
    }

    // ================================================================
    // POST /api/productionorders/{id}/start -- Start production
    // ================================================================
    [HttpPost("{id:guid}/start")]
    public async Task<ActionResult<ApiResponse<ProductionOrderDetailDto>>> Start(Guid id, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();
            var status = await conn.QuerySingleOrDefaultAsync<string>(
                "SELECT Status FROM production.ProductionOrders WHERE ProductionOrderId = @Id AND TenantId = @TenantId",
                new { Id = id, TenantId });

            if (status == null) throw new KeyNotFoundException("Production order not found");
            if (status != "APPROVED")
                throw new InvalidOperationException(
                    $"Only APPROVED orders can be started. Current status: {status}");

            await conn.ExecuteAsync(@"
                UPDATE production.ProductionOrders
                SET Status = 'IN_PRODUCTION', UpdatedAt = SYSUTCDATETIME()
                WHERE ProductionOrderId = @Id AND TenantId = @TenantId",
                new { Id = id, TenantId });

            var order = await GetProductionOrderById(conn, id);
            return Ok(ApiResponse<ProductionOrderDetailDto>.Ok(order, "Production started"));
        }
        catch (KeyNotFoundException)
        {
            throw;
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting production order {ProductionOrderId}", id);
            throw;
        }
    }

    // ================================================================
    // POST /api/productionorders/{id}/complete -- Complete production
    //   Updates produced quantities per size.
    //   If warehouseId is specified, creates stock inward movements.
    // ================================================================
    [HttpPost("{id:guid}/complete")]
    public async Task<ActionResult<ApiResponse<ProductionOrderDetailDto>>> Complete(
        Guid id, [FromBody] CompleteProductionRequest request, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();
            conn.Open();
            using var txn = conn.BeginTransaction();

            try
            {
                var orderData = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                    SELECT ProductionOrderId, Status, ArticleId
                    FROM production.ProductionOrders
                    WHERE ProductionOrderId = @Id AND TenantId = @TenantId",
                    new { Id = id, TenantId }, txn);

                if (orderData == null) throw new KeyNotFoundException("Production order not found");
                if ((string)orderData.Status != "IN_PRODUCTION")
                    throw new InvalidOperationException(
                        $"Only IN_PRODUCTION orders can be completed. Current status: {orderData.Status}");

                // Update produced quantities per size run
                foreach (var sr in request.SizeRunCompletions)
                {
                    await conn.ExecuteAsync(@"
                        UPDATE production.ProductionSizeRuns
                        SET ProducedQty = @ProducedQty
                        WHERE SizeRunId = @SizeRunId AND ProductionOrderId = @ProductionOrderId",
                        new { sr.SizeRunId, ProductionOrderId = id, sr.ProducedQty }, txn);
                }

                // Update order header
                await conn.ExecuteAsync(@"
                    UPDATE production.ProductionOrders
                    SET Status = 'COMPLETED', CompletedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
                    WHERE ProductionOrderId = @Id AND TenantId = @TenantId",
                    new { Id = id, TenantId }, txn);

                // If a warehouse is specified, create inward stock movements
                if (request.WarehouseId.HasValue)
                {
                    var sizeRuns = (await conn.QueryAsync<dynamic>(@"
                        SELECT SizeRunId, EuroSize, ProducedQty
                        FROM production.ProductionSizeRuns
                        WHERE ProductionOrderId = @Id AND ProducedQty > 0",
                        new { Id = id }, txn)).ToList();

                    foreach (var sr in sizeRuns)
                    {
                        var mvtParams = new DynamicParameters();
                        mvtParams.Add("TenantId", TenantId);
                        mvtParams.Add("WarehouseId", request.WarehouseId.Value);
                        mvtParams.Add("ArticleId", (Guid)orderData.ArticleId);
                        mvtParams.Add("EuroSize", (int)sr.EuroSize);
                        mvtParams.Add("MovementType", "PRODUCTION");
                        mvtParams.Add("Direction", "INWARD");
                        mvtParams.Add("Quantity", (int)sr.ProducedQty);
                        mvtParams.Add("ReferenceType", "ProductionOrder");
                        mvtParams.Add("ReferenceId", id);
                        mvtParams.Add("Notes", "Production completed");
                        mvtParams.Add("CreatedBy", UserId);

                        await conn.ExecuteAsync(
                            "inventory.sp_StockMovement_Record",
                            mvtParams,
                            txn,
                            commandType: CommandType.StoredProcedure);
                    }
                }

                txn.Commit();

                var order = await GetProductionOrderById(conn, id);
                return Ok(ApiResponse<ProductionOrderDetailDto>.Ok(order,
                    request.WarehouseId.HasValue
                        ? "Production completed and stock updated"
                        : "Production completed"));
            }
            catch
            {
                txn.Rollback();
                throw;
            }
        }
        catch (KeyNotFoundException)
        {
            throw;
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing production order {ProductionOrderId}", id);
            throw;
        }
    }

    // ================================================================
    // POST /api/productionorders/{id}/cancel -- Cancel production order
    // ================================================================
    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<ApiResponse<ProductionOrderDetailDto>>> Cancel(
        Guid id, [FromBody] CancelProductionBody request, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();
            var status = await conn.QuerySingleOrDefaultAsync<string>(
                "SELECT Status FROM production.ProductionOrders WHERE ProductionOrderId = @Id AND TenantId = @TenantId",
                new { Id = id, TenantId });

            if (status == null) throw new KeyNotFoundException("Production order not found");
            if (status is "COMPLETED" or "CANCELLED")
                throw new InvalidOperationException(
                    $"Production order cannot be cancelled. Current status: {status}");

            await conn.ExecuteAsync(@"
                UPDATE production.ProductionOrders
                SET Status = 'CANCELLED',
                    Notes = ISNULL(Notes, '') + CHAR(10) + 'Cancelled: ' + @Reason,
                    UpdatedAt = SYSUTCDATETIME()
                WHERE ProductionOrderId = @Id AND TenantId = @TenantId",
                new { Id = id, TenantId, Reason = request.Reason ?? "No reason provided" });

            var order = await GetProductionOrderById(conn, id);
            return Ok(ApiResponse<ProductionOrderDetailDto>.Ok(order, "Production order cancelled"));
        }
        catch (KeyNotFoundException)
        {
            throw;
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling production order {ProductionOrderId}", id);
            throw;
        }
    }

    // ================================================================
    // PUT /api/productionorders/{id}/size-runs -- Update produced quantities
    //   Used for partial production tracking during IN_PRODUCTION status.
    // ================================================================
    [HttpPut("{id:guid}/size-runs")]
    public async Task<ActionResult<ApiResponse<ProductionOrderDetailDto>>> UpdateSizeRuns(
        Guid id, [FromBody] List<UpdateSizeRunQuantity> sizeRuns, CancellationToken ct)
    {
        try
        {
            using var conn = CreateConnection();
            var status = await conn.QuerySingleOrDefaultAsync<string>(
                "SELECT Status FROM production.ProductionOrders WHERE ProductionOrderId = @Id AND TenantId = @TenantId",
                new { Id = id, TenantId });

            if (status == null) throw new KeyNotFoundException("Production order not found");
            if (status != "IN_PRODUCTION")
                throw new InvalidOperationException(
                    "Size runs can only be updated for IN_PRODUCTION orders");

            foreach (var sr in sizeRuns)
            {
                await conn.ExecuteAsync(@"
                    UPDATE production.ProductionSizeRuns
                    SET ProducedQty = @ProducedQty
                    WHERE SizeRunId = @SizeRunId AND ProductionOrderId = @ProductionOrderId",
                    new { sr.SizeRunId, ProductionOrderId = id, sr.ProducedQty });
            }

            await conn.ExecuteAsync(@"
                UPDATE production.ProductionOrders SET UpdatedAt = SYSUTCDATETIME()
                WHERE ProductionOrderId = @Id AND TenantId = @TenantId",
                new { Id = id, TenantId });

            var order = await GetProductionOrderById(conn, id);
            return Ok(ApiResponse<ProductionOrderDetailDto>.Ok(order, "Size runs updated"));
        }
        catch (KeyNotFoundException)
        {
            throw;
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating size runs for production order {ProductionOrderId}", id);
            throw;
        }
    }

    // ================================================================
    // Private Helpers
    // ================================================================

    private async Task<string> GenerateProductionOrderNo(IDbConnection conn, IDbTransaction txn)
    {
        var prefix = $"PO-{DateTime.UtcNow:yyyyMM}-";
        var sql = @"
            DECLARE @seq INT;
            SELECT @seq = ISNULL(MAX(CAST(RIGHT(OrderNo, 4) AS INT)), 0) + 1
            FROM production.ProductionOrders
            WHERE TenantId = @TenantId AND OrderNo LIKE @Prefix + '%';
            SELECT @Prefix + RIGHT('0000' + CAST(@seq AS VARCHAR(4)), 4);";

        return await conn.QuerySingleAsync<string>(sql, new { TenantId, Prefix = prefix }, txn);
    }

    private async Task<ProductionOrderDetailDto> GetProductionOrderById(IDbConnection conn, Guid id)
    {
        var sql = @"
            SELECT
                po.ProductionOrderId, po.OrderNo, po.OrderDate,
                po.ArticleId, a.ArticleCode, a.ArticleName, po.Color,
                po.GroupId, po.OrderType,
                po.Last, po.UpperLeather, po.LiningLeather, po.Sole,
                po.UpperCuttingDies, po.MaterialCuttingDies, po.SocksInsoleCuttingDies,
                po.TotalQuantity, po.Status, po.Notes,
                po.ApprovedBy, po.ApprovedAt, po.CompletedAt,
                po.CreatedAt, po.CreatedBy
            FROM production.ProductionOrders po
            INNER JOIN product.Articles a ON po.ArticleId = a.ArticleId
            WHERE po.ProductionOrderId = @Id AND po.TenantId = @TenantId;

            SELECT
                sr.SizeRunId, sr.ProductionOrderId, sr.EuroSize,
                sr.Quantity, sr.ProducedQty,
                (sr.Quantity - sr.ProducedQty) AS PendingQty
            FROM production.ProductionSizeRuns sr
            WHERE sr.ProductionOrderId = @Id
            ORDER BY sr.EuroSize;";

        using var multi = await conn.QueryMultipleAsync(sql, new { Id = id, TenantId });

        var order = await multi.ReadSingleOrDefaultAsync<ProductionOrderDetailDto>();
        if (order == null)
            throw new KeyNotFoundException("Production order not found");

        order.SizeRuns = (await multi.ReadAsync<ProductionSizeRunDto>()).ToList();
        return order;
    }
}

// ================================================================
// Query Parameters
// ================================================================

public class ProductionQueryParams
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
    public string? Search { get; set; }
    public string? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

// ================================================================
// Request Models
// ================================================================

public class CreateProductionOrderRequest
{
    public Guid ArticleId { get; set; }
    public Guid? GroupId { get; set; }
    public string Color { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public string? OrderType { get; set; }   // REPLENISHMENT, FRESH, SAMPLE
    public string? Last { get; set; }
    public string? UpperLeather { get; set; }
    public string? LiningLeather { get; set; }
    public string? Sole { get; set; }
    public string? UpperCuttingDies { get; set; }
    public string? MaterialCuttingDies { get; set; }
    public string? SocksInsoleCuttingDies { get; set; }
    public string? Notes { get; set; }
    public List<ProductionSizeRunInput> SizeRuns { get; set; } = new();
}

public class ProductionSizeRunInput
{
    public int EuroSize { get; set; }
    public int Quantity { get; set; }
}

public class CompleteProductionRequest
{
    public Guid? WarehouseId { get; set; }    // If set, creates inward stock movements
    public List<SizeRunCompletion> SizeRunCompletions { get; set; } = new();
}

public class SizeRunCompletion
{
    public Guid SizeRunId { get; set; }
    public int ProducedQty { get; set; }
}

public class UpdateSizeRunQuantity
{
    public Guid SizeRunId { get; set; }
    public int ProducedQty { get; set; }
}

public class CancelProductionBody
{
    public string? Reason { get; set; }
}

// ================================================================
// Response DTOs
// ================================================================

public class ProductionOrderListDto
{
    public Guid ProductionOrderId { get; set; }
    public string OrderNo { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public string ArticleCode { get; set; } = string.Empty;
    public string ArticleName { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string OrderType { get; set; } = string.Empty;
    public int TotalQuantity { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class ProductionOrderDetailDto
{
    public Guid ProductionOrderId { get; set; }
    public string OrderNo { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public Guid ArticleId { get; set; }
    public string ArticleCode { get; set; } = string.Empty;
    public string ArticleName { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public Guid? GroupId { get; set; }
    public string OrderType { get; set; } = string.Empty;
    public string? Last { get; set; }
    public string? UpperLeather { get; set; }
    public string? LiningLeather { get; set; }
    public string? Sole { get; set; }
    public string? UpperCuttingDies { get; set; }
    public string? MaterialCuttingDies { get; set; }
    public string? SocksInsoleCuttingDies { get; set; }
    public int TotalQuantity { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public List<ProductionSizeRunDto> SizeRuns { get; set; } = new();
}

public class ProductionSizeRunDto
{
    public Guid SizeRunId { get; set; }
    public Guid ProductionOrderId { get; set; }
    public int EuroSize { get; set; }
    public int Quantity { get; set; }
    public int ProducedQty { get; set; }
    public int PendingQty { get; set; }
}
