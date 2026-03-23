using Microsoft.EntityFrameworkCore;
using RetailERP.Production.Domain.Entities;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Production.Application.Services;

public interface IProductionService
{
    Task<ProductionOrderDto> CreateAsync(Guid tenantId, Guid userId, CreateProductionOrderRequest request, CancellationToken ct = default);
    Task<ProductionOrderDto> GetByIdAsync(Guid tenantId, Guid id, CancellationToken ct = default);
    Task<PagedResult<ProductionOrderListDto>> GetAllAsync(Guid tenantId, ProductionQueryParams query, CancellationToken ct = default);
    Task<ProductionOrderDto> ApproveAsync(Guid tenantId, Guid userId, Guid id, CancellationToken ct = default);
    Task<ProductionOrderDto> StartAsync(Guid tenantId, Guid id, CancellationToken ct = default);
    Task<ProductionOrderDto> CompleteAsync(Guid tenantId, Guid userId, Guid id, CompleteProductionRequest request, CancellationToken ct = default);
    Task<ProductionOrderDto> CancelAsync(Guid tenantId, Guid userId, Guid id, string reason, CancellationToken ct = default);
    Task<ProductionOrderDto> UpdateSizeRunAsync(Guid tenantId, Guid id, List<UpdateSizeRunRequest> sizeRuns, CancellationToken ct = default);

    /// <summary>
    /// Unified status transition method.
    /// Validates state transitions: Draft->Approved->InProgress->Completed, any->Cancelled.
    /// Actions: "approve", "start", "complete", "cancel".
    /// </summary>
    Task<ProductionOrderDto> UpdateStatusAsync(Guid tenantId, Guid userId, Guid id, UpdateProductionStatusRequest request, CancellationToken ct = default);
}

public class ProductionService : IProductionService
{
    private readonly DbContext _context;

    public ProductionService(DbContext context)
    {
        _context = context;
    }

    public async Task<ProductionOrderDto> CreateAsync(
        Guid tenantId, Guid userId, CreateProductionOrderRequest request, CancellationToken ct = default)
    {
        var productionNumber = await GenerateProductionNumberAsync(tenantId, ct);

        var order = new ProductionOrder
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ProductionNumber = productionNumber,
            ArticleId = request.ArticleId,
            SKU = request.SKU,
            ArticleName = request.ArticleName,
            SalesOrderId = request.SalesOrderId,
            SalesOrderNumber = request.SalesOrderNumber,
            WarehouseId = request.WarehouseId,
            Status = "Draft",
            PlannedStartDate = request.PlannedStartDate,
            PlannedEndDate = request.PlannedEndDate,
            Season = request.Season,
            EstimatedCost = request.EstimatedCost,
            Notes = request.Notes,
            CreatedBy = userId
        };

        int totalQty = 0;
        foreach (var sr in request.SizeRuns)
        {
            order.SizeRuns.Add(new ProductionSizeRun
            {
                SizeRunId = Guid.NewGuid(),
                ProductionOrderId = order.Id,
                Size = sr.Size,
                Color = sr.Color,
                PlannedQuantity = sr.PlannedQuantity
            });
            totalQty += sr.PlannedQuantity;
        }
        order.TotalQuantity = totalQty;

        _context.Set<ProductionOrder>().Add(order);
        await _context.SaveChangesAsync(ct);

        return await GetByIdAsync(tenantId, order.Id, ct);
    }

    public async Task<ProductionOrderDto> GetByIdAsync(Guid tenantId, Guid id, CancellationToken ct = default)
    {
        var order = await _context.Set<ProductionOrder>()
            .Include(p => p.SizeRuns)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Production order not found");

        return MapToDto(order);
    }

    public async Task<PagedResult<ProductionOrderListDto>> GetAllAsync(
        Guid tenantId, ProductionQueryParams query, CancellationToken ct = default)
    {
        var q = _context.Set<ProductionOrder>()
            .Where(p => p.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(p => p.Status == query.Status);
        if (!string.IsNullOrWhiteSpace(query.SearchTerm))
            q = q.Where(p => p.ProductionNumber.Contains(query.SearchTerm) || p.SKU.Contains(query.SearchTerm));
        if (query.ArticleId.HasValue)
            q = q.Where(p => p.ArticleId == query.ArticleId.Value);
        if (query.FromDate.HasValue)
            q = q.Where(p => p.PlannedStartDate >= query.FromDate.Value);
        if (query.ToDate.HasValue)
            q = q.Where(p => p.PlannedEndDate <= query.ToDate.Value);

        var totalCount = await q.CountAsync(ct);

        var items = await q
            .OrderByDescending(p => p.CreatedAt)
            .Skip((query.PageNumber - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(p => new ProductionOrderListDto
            {
                ProductionOrderId = p.Id,
                ProductionNumber = p.ProductionNumber,
                SKU = p.SKU,
                ArticleName = p.ArticleName,
                Status = p.Status,
                TotalQuantity = p.TotalQuantity,
                CompletedQuantity = p.CompletedQuantity,
                PlannedStartDate = p.PlannedStartDate,
                PlannedEndDate = p.PlannedEndDate,
                Season = p.Season
            })
            .ToListAsync(ct);

        return new PagedResult<ProductionOrderListDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = query.PageNumber,
            PageSize = query.PageSize
        };
    }

    public async Task<ProductionOrderDto> ApproveAsync(
        Guid tenantId, Guid userId, Guid id, CancellationToken ct = default)
    {
        var order = await _context.Set<ProductionOrder>()
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Production order not found");

        if (order.Status != "Draft")
            throw new InvalidOperationException($"Production order cannot be approved. Current status: {order.Status}");

        order.Status = "Approved";
        order.ApprovedBy = userId;
        order.ApprovedAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetByIdAsync(tenantId, id, ct);
    }

    public async Task<ProductionOrderDto> StartAsync(
        Guid tenantId, Guid id, CancellationToken ct = default)
    {
        var order = await _context.Set<ProductionOrder>()
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Production order not found");

        if (order.Status != "Approved")
            throw new InvalidOperationException($"Production order cannot be started. Current status: {order.Status}");

        order.Status = "InProgress";
        order.ActualStartDate = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetByIdAsync(tenantId, id, ct);
    }

    public async Task<ProductionOrderDto> CompleteAsync(
        Guid tenantId, Guid userId, Guid id, CompleteProductionRequest request, CancellationToken ct = default)
    {
        var order = await _context.Set<ProductionOrder>()
            .Include(p => p.SizeRuns)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Production order not found");

        if (order.Status != "InProgress")
            throw new InvalidOperationException($"Production order cannot be completed. Current status: {order.Status}");

        if (!order.WarehouseId.HasValue)
            throw new InvalidOperationException("Production order must have a warehouse assigned before completion");

        // Update size run quantities from completion data
        foreach (var completion in request.SizeRunCompletions)
        {
            var sizeRun = order.SizeRuns.FirstOrDefault(sr => sr.SizeRunId == completion.SizeRunId)
                ?? throw new KeyNotFoundException($"Size run {completion.SizeRunId} not found");

            sizeRun.CompletedQuantity = completion.CompletedQuantity;
            sizeRun.RejectedQuantity = completion.RejectedQuantity;
        }

        order.CompletedQuantity = order.SizeRuns.Sum(sr => sr.CompletedQuantity);
        order.RejectedQuantity = order.SizeRuns.Sum(sr => sr.RejectedQuantity);
        order.Status = "Completed";
        order.CompletedBy = userId;
        order.CompletedAt = DateTime.UtcNow;
        order.ActualEndDate = DateTime.UtcNow;
        order.ActualCost = request.ActualCost;
        order.UpdatedAt = DateTime.UtcNow;

        // Add completed quantities to StockLedger as inward stock
        // Each size run with CompletedQuantity > 0 gets added to inventory
        foreach (var sizeRun in order.SizeRuns.Where(sr => sr.CompletedQuantity > 0))
        {
            // Parse size string to EuroSize integer
            if (!int.TryParse(sizeRun.Size, out var euroSize))
                continue; // Skip non-numeric sizes

            var ledgerRow = await _context.Set<ProductionStockLedger>()
                .FirstOrDefaultAsync(sl =>
                    sl.TenantId == tenantId
                    && sl.WarehouseId == order.WarehouseId.Value
                    && sl.ArticleId == order.ArticleId
                    && sl.EuroSize == euroSize, ct);

            if (ledgerRow != null)
            {
                // Existing row: increment InwardQty
                ledgerRow.InwardQty += sizeRun.CompletedQuantity;
                ledgerRow.LastUpdated = DateTime.UtcNow;
            }
            else
            {
                // No row exists: create a new StockLedger entry
                _context.Set<ProductionStockLedger>().Add(new ProductionStockLedger
                {
                    StockLedgerId = Guid.NewGuid(),
                    TenantId = tenantId,
                    WarehouseId = order.WarehouseId.Value,
                    ArticleId = order.ArticleId,
                    EuroSize = euroSize,
                    OpeningStock = 0,
                    InwardQty = sizeRun.CompletedQuantity,
                    OutwardQty = 0,
                    LastUpdated = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync(ct);
        return await GetByIdAsync(tenantId, id, ct);
    }

    public async Task<ProductionOrderDto> CancelAsync(
        Guid tenantId, Guid userId, Guid id, string reason, CancellationToken ct = default)
    {
        var order = await _context.Set<ProductionOrder>()
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Production order not found");

        if (order.Status == "Completed" || order.Status == "Cancelled")
            throw new InvalidOperationException($"Production order cannot be cancelled. Current status: {order.Status}");

        order.Status = "Cancelled";
        order.Notes = $"{order.Notes}\nCancelled: {reason}".Trim();
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetByIdAsync(tenantId, id, ct);
    }

    public async Task<ProductionOrderDto> UpdateSizeRunAsync(
        Guid tenantId, Guid id, List<UpdateSizeRunRequest> sizeRuns, CancellationToken ct = default)
    {
        var order = await _context.Set<ProductionOrder>()
            .Include(p => p.SizeRuns)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Production order not found");

        if (order.Status != "InProgress")
            throw new InvalidOperationException("Size runs can only be updated for in-progress orders");

        foreach (var update in sizeRuns)
        {
            var sizeRun = order.SizeRuns.FirstOrDefault(sr => sr.SizeRunId == update.SizeRunId)
                ?? throw new KeyNotFoundException($"Size run {update.SizeRunId} not found");

            sizeRun.CompletedQuantity = update.CompletedQuantity;
            sizeRun.RejectedQuantity = update.RejectedQuantity;
        }

        order.CompletedQuantity = order.SizeRuns.Sum(sr => sr.CompletedQuantity);
        order.RejectedQuantity = order.SizeRuns.Sum(sr => sr.RejectedQuantity);
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetByIdAsync(tenantId, id, ct);
    }

    /// <summary>
    /// Unified status transition handler.
    /// State machine: Draft -> Approved -> InProgress -> Completed
    ///                Any (except Completed/Cancelled) -> Cancelled
    /// </summary>
    public async Task<ProductionOrderDto> UpdateStatusAsync(
        Guid tenantId, Guid userId, Guid id, UpdateProductionStatusRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Action))
            throw new ArgumentException("Action is required. Supported: approve, start, complete, cancel");

        var action = request.Action.ToLowerInvariant().Trim();

        return action switch
        {
            "approve" => await ApproveAsync(tenantId, userId, id, ct),
            "start" => await StartAsync(tenantId, id, ct),
            "complete" => await CompleteAsync(tenantId, userId, id,
                new CompleteProductionRequest
                {
                    ActualCost = request.ActualCost,
                    SizeRunCompletions = request.SizeRunCompletions ?? new()
                }, ct),
            "cancel" => await CancelAsync(tenantId, userId, id,
                request.Reason ?? throw new ArgumentException("Reason is required for cancellation"), ct),
            _ => throw new ArgumentException(
                $"Invalid action '{request.Action}'. Supported actions: approve, start, complete, cancel")
        };
    }

    private async Task<string> GenerateProductionNumberAsync(Guid tenantId, CancellationToken ct)
    {
        var today = DateTime.UtcNow;
        var prefix = $"PO-{today:yyyyMM}";
        var last = await _context.Set<ProductionOrder>()
            .Where(p => p.TenantId == tenantId && p.ProductionNumber.StartsWith(prefix))
            .OrderByDescending(p => p.ProductionNumber)
            .FirstOrDefaultAsync(ct);

        var sequence = 1;
        if (last != null)
        {
            var lastSeq = last.ProductionNumber.Split('-').Last();
            if (int.TryParse(lastSeq, out var parsed))
                sequence = parsed + 1;
        }

        return $"{prefix}-{sequence:D4}";
    }

    private static ProductionOrderDto MapToDto(ProductionOrder order) => new()
    {
        ProductionOrderId = order.Id,
        ProductionNumber = order.ProductionNumber,
        ArticleId = order.ArticleId,
        SKU = order.SKU,
        ArticleName = order.ArticleName,
        SalesOrderId = order.SalesOrderId,
        SalesOrderNumber = order.SalesOrderNumber,
        WarehouseId = order.WarehouseId,
        Status = order.Status,
        PlannedStartDate = order.PlannedStartDate,
        PlannedEndDate = order.PlannedEndDate,
        ActualStartDate = order.ActualStartDate,
        ActualEndDate = order.ActualEndDate,
        TotalQuantity = order.TotalQuantity,
        CompletedQuantity = order.CompletedQuantity,
        RejectedQuantity = order.RejectedQuantity,
        Season = order.Season,
        EstimatedCost = order.EstimatedCost,
        ActualCost = order.ActualCost,
        Notes = order.Notes,
        SizeRuns = order.SizeRuns.Select(sr => new ProductionSizeRunDto
        {
            SizeRunId = sr.SizeRunId,
            Size = sr.Size,
            Color = sr.Color,
            PlannedQuantity = sr.PlannedQuantity,
            CompletedQuantity = sr.CompletedQuantity,
            RejectedQuantity = sr.RejectedQuantity,
            PendingQuantity = sr.PendingQuantity
        }).ToList()
    };
}

// DTOs
public class ProductionOrderDto
{
    public Guid ProductionOrderId { get; set; }
    public string ProductionNumber { get; set; } = string.Empty;
    public Guid ArticleId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? ArticleName { get; set; }
    public Guid? SalesOrderId { get; set; }
    public string? SalesOrderNumber { get; set; }
    public Guid? WarehouseId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime PlannedStartDate { get; set; }
    public DateTime PlannedEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime? ActualEndDate { get; set; }
    public int TotalQuantity { get; set; }
    public int CompletedQuantity { get; set; }
    public int RejectedQuantity { get; set; }
    public string? Season { get; set; }
    public decimal EstimatedCost { get; set; }
    public decimal? ActualCost { get; set; }
    public string? Notes { get; set; }
    public List<ProductionSizeRunDto> SizeRuns { get; set; } = new();
}

public class ProductionSizeRunDto
{
    public Guid SizeRunId { get; set; }
    public string Size { get; set; } = string.Empty;
    public string? Color { get; set; }
    public int PlannedQuantity { get; set; }
    public int CompletedQuantity { get; set; }
    public int RejectedQuantity { get; set; }
    public int PendingQuantity { get; set; }
}

public class ProductionOrderListDto
{
    public Guid ProductionOrderId { get; set; }
    public string ProductionNumber { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string? ArticleName { get; set; }
    public string Status { get; set; } = string.Empty;
    public int TotalQuantity { get; set; }
    public int CompletedQuantity { get; set; }
    public DateTime PlannedStartDate { get; set; }
    public DateTime PlannedEndDate { get; set; }
    public string? Season { get; set; }
}

public class CreateProductionOrderRequest
{
    public Guid ArticleId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? ArticleName { get; set; }
    public Guid? SalesOrderId { get; set; }
    public string? SalesOrderNumber { get; set; }
    public Guid? WarehouseId { get; set; }
    public DateTime PlannedStartDate { get; set; }
    public DateTime PlannedEndDate { get; set; }
    public string? Season { get; set; }
    public decimal EstimatedCost { get; set; }
    public string? Notes { get; set; }
    public List<CreateSizeRunRequest> SizeRuns { get; set; } = new();
}

public class CreateSizeRunRequest
{
    public string Size { get; set; } = string.Empty;
    public string? Color { get; set; }
    public int PlannedQuantity { get; set; }
}

public class CompleteProductionRequest
{
    public decimal? ActualCost { get; set; }
    public List<SizeRunCompletionRequest> SizeRunCompletions { get; set; } = new();
}

public class SizeRunCompletionRequest
{
    public Guid SizeRunId { get; set; }
    public int CompletedQuantity { get; set; }
    public int RejectedQuantity { get; set; }
}

public class UpdateSizeRunRequest
{
    public Guid SizeRunId { get; set; }
    public int CompletedQuantity { get; set; }
    public int RejectedQuantity { get; set; }
}

public class ProductionQueryParams : PagedQuery
{
    public string? Status { get; set; }
    public Guid? ArticleId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

public class CancelProductionRequest
{
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// Request DTO for the unified PUT /api/production/{id}/status endpoint.
/// Action determines the transition: "approve", "start", "complete", "cancel".
/// </summary>
public class UpdateProductionStatusRequest
{
    public string Action { get; set; } = string.Empty; // "approve", "start", "complete", "cancel"
    public string? Reason { get; set; }                 // Required for cancel
    public decimal? ActualCost { get; set; }            // Optional, used for complete
    public List<SizeRunCompletionRequest>? SizeRunCompletions { get; set; } // Used for complete
}
