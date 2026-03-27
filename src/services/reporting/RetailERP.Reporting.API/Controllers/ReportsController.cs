using System.Data;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Reporting.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly string _connectionString;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));

    public ReportsController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")!;
    }

    private IDbConnection CreateConnection() => new SqlConnection(_connectionString);

    [HttpGet("sales")]
    public async Task<ActionResult<ApiResponse<List<SalesReportRow>>>> SalesReport(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] Guid? clientId, CancellationToken ct)
    {
        var from = fromDate ?? DateTime.UtcNow.AddDays(-30);
        var to = toDate ?? DateTime.UtcNow;
        using var conn = CreateConnection();
        var sql = @"
            SELECT
                o.OrderId,
                o.OrderNo AS OrderNumber,
                o.OrderDate,
                c.ClientName,
                c.ClientCode,
                o.Status,
                0 AS SubTotal,
                0 AS DiscountAmount,
                0 AS TaxableAmount,
                0 AS TotalTax,
                o.TotalAmount,
                COUNT(ol.OrderLineId) AS TotalLines,
                SUM(ol.Quantity) AS TotalQuantity
            FROM sales.CustomerOrders o
            INNER JOIN sales.Clients c ON o.ClientId = c.ClientId AND c.TenantId = @TenantId
            LEFT JOIN sales.OrderLines ol ON o.OrderId = ol.OrderId
            WHERE o.TenantId = @TenantId
              AND o.OrderDate >= @FromDate
              AND o.OrderDate <= @ToDate
              AND (@ClientId IS NULL OR o.ClientId = @ClientId)
            GROUP BY o.OrderId, o.OrderNo, o.OrderDate, c.ClientName, c.ClientCode,
                     o.Status, o.TotalAmount
            ORDER BY o.OrderDate DESC";

        var result = (await conn.QueryAsync<SalesReportRow>(sql, new
        {
            TenantId,
            FromDate = from,
            ToDate = to,
            ClientId = clientId
        })).ToList();

        return Ok(ApiResponse<List<SalesReportRow>>.Ok(result));
    }

    [HttpGet("inventory")]
    public async Task<ActionResult<ApiResponse<List<InventoryReportRow>>>> InventoryReport(
        [FromQuery] Guid? warehouseId, [FromQuery] bool lowStockOnly = false, CancellationToken ct = default)
    {
        using var conn = CreateConnection();
        var sql = @"
            SELECT
                sl.StockLedgerId,
                sl.ArticleId,
                ISNULL(a.ArticleCode, '') AS SKU,
                CAST(sl.EuroSize AS NVARCHAR(20)) AS Size,
                ISNULL(a.Color, '') AS Color,
                w.WarehouseName,
                w.WarehouseCode,
                sl.ClosingStock AS QuantityOnHand,
                0 AS QuantityReserved,
                sl.ClosingStock AS QuantityAvailable,
                0 AS ReorderLevel,
                0 AS ReorderQuantity,
                0 AS IsLowStock
            FROM inventory.StockLedger sl
            INNER JOIN warehouse.Warehouses w ON sl.WarehouseId = w.WarehouseId AND w.TenantId = @TenantId
            LEFT JOIN product.Articles a ON sl.ArticleId = a.ArticleId
            WHERE sl.TenantId = @TenantId
              AND (@WarehouseId IS NULL OR sl.WarehouseId = @WarehouseId)
              AND (@LowStockOnly = 0 OR sl.ClosingStock <= 0)
            ORDER BY a.ArticleCode, w.WarehouseName";

        var result = (await conn.QueryAsync<InventoryReportRow>(sql, new
        {
            TenantId,
            WarehouseId = warehouseId,
            LowStockOnly = lowStockOnly ? 1 : 0
        })).ToList();

        return Ok(ApiResponse<List<InventoryReportRow>>.Ok(result));
    }

    [HttpGet("production")]
    public async Task<ActionResult<ApiResponse<List<ProductionReportRow>>>> ProductionReport(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] string? status, CancellationToken ct = default)
    {
        var from = fromDate ?? DateTime.UtcNow.AddDays(-30);
        var to = toDate ?? DateTime.UtcNow;
        using var conn = CreateConnection();
        var sql = @"
            SELECT
                po.ProductionOrderId,
                po.OrderNo AS ProductionNumber,
                ISNULL(a.ArticleCode, '') AS SKU,
                a.ArticleName,
                po.Status,
                po.OrderDate AS PlannedStartDate,
                po.OrderDate AS PlannedEndDate,
                NULL AS ActualStartDate,
                po.CompletedAt AS ActualEndDate,
                po.TotalQuantity,
                0 AS CompletedQuantity,
                0 AS RejectedQuantity,
                po.TotalQuantity AS PendingQuantity,
                0 AS EstimatedCost,
                NULL AS ActualCost,
                NULL AS Season
            FROM production.ProductionOrders po
            LEFT JOIN product.Articles a ON po.ArticleId = a.ArticleId
            WHERE po.TenantId = @TenantId
              AND po.OrderDate >= @FromDate
              AND po.OrderDate <= @ToDate
              AND (@Status IS NULL OR po.Status = @Status)
            ORDER BY po.OrderDate DESC";

        var result = (await conn.QueryAsync<ProductionReportRow>(sql, new
        {
            TenantId,
            FromDate = from,
            ToDate = to,
            Status = status
        })).ToList();

        return Ok(ApiResponse<List<ProductionReportRow>>.Ok(result));
    }

    [HttpGet("gst")]
    public async Task<ActionResult<ApiResponse<List<GSTReportRow>>>> GSTReport(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, CancellationToken ct = default)
    {
        var from = fromDate ?? DateTime.UtcNow.AddDays(-30);
        var to = toDate ?? DateTime.UtcNow;
        using var conn = CreateConnection();
        var sql = @"
            SELECT
                i.InvoiceId,
                i.InvoiceNo AS InvoiceNumber,
                i.InvoiceDate,
                i.BillToName AS ClientName,
                i.BillToGSTIN AS ClientGSTIN,
                i.IsInterState,
                i.SellerState,
                i.BuyerState,
                i.TaxableAmount,
                i.CGSTTotal,
                i.SGSTTotal,
                i.IGSTTotal,
                i.TotalTax,
                i.TotalAmount,
                i.Status
            FROM billing.Invoices i
            WHERE i.TenantId = @TenantId
              AND i.InvoiceDate >= @FromDate
              AND i.InvoiceDate <= @ToDate
              AND i.Status != 'Cancelled'
            ORDER BY i.InvoiceDate DESC";

        var result = (await conn.QueryAsync<GSTReportRow>(sql, new
        {
            TenantId,
            FromDate = from,
            ToDate = to
        })).ToList();

        return Ok(ApiResponse<List<GSTReportRow>>.Ok(result));
    }

    [HttpGet("client-orders")]
    public async Task<ActionResult<ApiResponse<List<ClientOrderReportRow>>>> ClientOrderReport(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] Guid? clientId, CancellationToken ct = default)
    {
        var from = fromDate ?? DateTime.UtcNow.AddDays(-30);
        var to = toDate ?? DateTime.UtcNow;
        using var conn = CreateConnection();
        var sql = @"
            SELECT
                c.ClientId,
                c.ClientCode,
                c.ClientName,
                NULL AS City,
                c.StateCode AS State,
                NULL AS ClientType,
                COUNT(DISTINCT o.OrderId) AS TotalOrders,
                SUM(CASE WHEN o.Status = 'Confirmed' THEN 1 ELSE 0 END) AS ConfirmedOrders,
                SUM(CASE WHEN o.Status = 'Delivered' THEN 1 ELSE 0 END) AS DeliveredOrders,
                SUM(CASE WHEN o.Status = 'Cancelled' THEN 1 ELSE 0 END) AS CancelledOrders,
                SUM(o.TotalAmount) AS TotalOrderValue,
                SUM(CASE WHEN o.Status != 'Cancelled' THEN o.TotalAmount ELSE 0 END) AS NetOrderValue,
                MIN(o.OrderDate) AS FirstOrderDate,
                MAX(o.OrderDate) AS LastOrderDate
            FROM sales.Clients c
            LEFT JOIN sales.CustomerOrders o ON c.ClientId = o.ClientId
                AND o.OrderDate >= @FromDate
                AND o.OrderDate <= @ToDate
            WHERE c.TenantId = @TenantId
              AND c.IsActive = 1
              AND (@ClientId IS NULL OR c.ClientId = @ClientId)
            GROUP BY c.ClientId, c.ClientCode, c.ClientName, c.StateCode
            ORDER BY SUM(o.TotalAmount) DESC";

        var result = (await conn.QueryAsync<ClientOrderReportRow>(sql, new
        {
            TenantId,
            FromDate = from,
            ToDate = to,
            ClientId = clientId
        })).ToList();

        return Ok(ApiResponse<List<ClientOrderReportRow>>.Ok(result));
    }
}

// Report DTOs
public class SalesReportRow
{
    public Guid OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string ClientCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalAmount { get; set; }
    public int TotalLines { get; set; }
    public int TotalQuantity { get; set; }
}

public class InventoryReportRow
{
    public Guid StockLedgerId { get; set; }
    public Guid ArticleId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public int QuantityOnHand { get; set; }
    public int QuantityReserved { get; set; }
    public int QuantityAvailable { get; set; }
    public int ReorderLevel { get; set; }
    public int ReorderQuantity { get; set; }
    public bool IsLowStock { get; set; }
}

public class ProductionReportRow
{
    public Guid ProductionOrderId { get; set; }
    public string ProductionNumber { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string? ArticleName { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime PlannedStartDate { get; set; }
    public DateTime PlannedEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime? ActualEndDate { get; set; }
    public int TotalQuantity { get; set; }
    public int CompletedQuantity { get; set; }
    public int RejectedQuantity { get; set; }
    public int PendingQuantity { get; set; }
    public decimal EstimatedCost { get; set; }
    public decimal? ActualCost { get; set; }
    public string? Season { get; set; }
}

public class GSTReportRow
{
    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string? ClientGSTIN { get; set; }
    public bool IsInterState { get; set; }
    public string? SellerState { get; set; }
    public string? BuyerState { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal CGSTTotal { get; set; }
    public decimal SGSTTotal { get; set; }
    public decimal IGSTTotal { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class ClientOrderReportRow
{
    public Guid ClientId { get; set; }
    public string ClientCode { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? State { get; set; }
    public string ClientType { get; set; } = string.Empty;
    public int TotalOrders { get; set; }
    public int ConfirmedOrders { get; set; }
    public int DeliveredOrders { get; set; }
    public int CancelledOrders { get; set; }
    public decimal? TotalOrderValue { get; set; }
    public decimal? NetOrderValue { get; set; }
    public DateTime? FirstOrderDate { get; set; }
    public DateTime? LastOrderDate { get; set; }
}
