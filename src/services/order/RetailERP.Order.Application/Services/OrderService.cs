using Microsoft.EntityFrameworkCore;
using RetailERP.Order.Application.Interfaces;
using RetailERP.Order.Domain.Entities;
using RetailERP.Shared.Contracts.Common;
using RetailERP.Shared.Contracts.Order;

namespace RetailERP.Order.Application.Services;

public class OrderService : IOrderService
{
    private readonly DbContext _context;

    public OrderService(DbContext context)
    {
        _context = context;
    }

    // ================================================================
    //  GET /api/orders -- paginated list with filters
    // ================================================================

    public async Task<PagedResult<OrderListResponse>> GetOrdersAsync(
        Guid tenantId, OrderQueryParams query, CancellationToken ct = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var q = _context.Set<CustomerOrder>()
            .Include(o => o.Client)
            .Include(o => o.Store)
            .Where(o => o.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(o => o.Status == query.Status);

        if (query.ClientId.HasValue)
            q = q.Where(o => o.ClientId == query.ClientId.Value);

        if (query.StoreId.HasValue)
            q = q.Where(o => o.StoreId == query.StoreId.Value);

        if (query.FromDate.HasValue)
            q = q.Where(o => o.OrderDate >= query.FromDate.Value);

        if (query.ToDate.HasValue)
            q = q.Where(o => o.OrderDate <= query.ToDate.Value);

        if (!string.IsNullOrWhiteSpace(query.Search))
            q = q.Where(o =>
                o.OrderNo.Contains(query.Search) ||
                o.Client.ClientName.Contains(query.Search) ||
                o.Store.StoreName.Contains(query.Search));

        var totalCount = await q.CountAsync(ct);

        var items = await q
            .OrderByDescending(o => o.OrderDate)
            .ThenByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new OrderListResponse
            {
                OrderId = o.Id,
                OrderNo = o.OrderNo,
                OrderDate = o.OrderDate,
                ClientName = o.Client.ClientName,
                StoreName = o.Store.StoreName,
                TotalQuantity = o.TotalQuantity,
                TotalAmount = o.TotalAmount,
                Status = o.Status,
                TotalLines = o.Lines.Count,
                TotalSizes = o.Lines.SelectMany(l => l.SizeRuns).Count()
            })
            .ToListAsync(ct);

        return new PagedResult<OrderListResponse>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = page,
            PageSize = pageSize
        };
    }

    // ================================================================
    //  GET /api/orders/{id} -- order detail with lines and size runs
    // ================================================================

    public async Task<OrderResponse> GetOrderByIdAsync(
        Guid tenantId, Guid orderId, CancellationToken ct = default)
    {
        var order = await _context.Set<CustomerOrder>()
            .Include(o => o.Client)
            .Include(o => o.Store)
            .Include(o => o.Lines)
                .ThenInclude(l => l.SizeRuns)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Order not found");

        return MapToResponse(order);
    }

    // ================================================================
    //  GET /api/orders/stock/{warehouseId}/{articleId}
    //  Returns per-size stock position showing warehouse stock,
    //  customer-allocated, and available quantities.
    // ================================================================

    public async Task<StockPositionResponse> GetArticleStockAsync(
        Guid tenantId, Guid warehouseId, Guid articleId, CancellationToken ct = default)
    {
        // Get warehouse stock per size from inventory.StockLedger
        var warehouseStock = await _context.Set<StockLedgerView>()
            .Where(s => s.TenantId == tenantId
                     && s.WarehouseId == warehouseId
                     && s.ArticleId == articleId)
            .ToListAsync(ct);

        // Get already-allocated quantities per size from Draft/Confirmed orders in same warehouse
        var allocatedQty = await _context.Set<OrderSizeRun>()
            .Where(sr => sr.OrderLine.ArticleId == articleId
                      && sr.OrderLine.Order.WarehouseId == warehouseId
                      && sr.OrderLine.Order.TenantId == tenantId
                      && (sr.OrderLine.Order.Status == "Draft" || sr.OrderLine.Order.Status == "Confirmed"))
            .GroupBy(sr => sr.EuroSize)
            .Select(g => new { EuroSize = g.Key, Allocated = g.Sum(x => x.Quantity) })
            .ToListAsync(ct);

        var allocatedLookup = allocatedQty.ToDictionary(a => a.EuroSize, a => a.Allocated);

        var allSizes = warehouseStock.Select(s => s.EuroSize).Distinct().OrderBy(s => s);

        var sizePositions = new List<SizeStockPosition>();
        foreach (var size in allSizes)
        {
            var stock = warehouseStock.FirstOrDefault(s => s.EuroSize == size);
            var whStock = stock?.ClosingStock ?? 0;
            allocatedLookup.TryGetValue(size, out var allocated);
            var available = whStock - allocated;

            sizePositions.Add(new SizeStockPosition
            {
                EuroSize = size,
                WarehouseStock = whStock,
                CustomerAllocated = allocated,
                Available = Math.Max(0, available)
            });
        }

        return new StockPositionResponse
        {
            ArticleId = articleId,
            WarehouseId = warehouseId,
            Sizes = sizePositions
        };
    }

    // ================================================================
    //  POST /api/orders -- create size-wise order
    //  Structure: Order -> OrderLine (per article) -> OrderSizeRun (per size)
    // ================================================================

    public async Task<OrderResponse> CreateOrderAsync(
        Guid tenantId, Guid userId, CreateSizeWiseOrderRequest request,
        CancellationToken ct = default)
    {
        var client = await _context.Set<Client>()
            .FirstOrDefaultAsync(c => c.Id == request.ClientId && c.TenantId == tenantId && c.IsActive, ct)
            ?? throw new KeyNotFoundException("Client not found");

        if (!request.Articles.Any())
            throw new ArgumentException("Order must have at least one article");

        var orderNo = await GenerateOrderNoAsync(tenantId, ct);

        var order = new CustomerOrder
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            OrderNo = orderNo,
            OrderDate = request.OrderDate == DateTime.MinValue ? DateTime.UtcNow : request.OrderDate,
            ClientId = request.ClientId,
            StoreId = request.StoreId,
            WarehouseId = request.WarehouseId,
            Status = "Draft",
            Channel = request.Channel,
            Notes = request.Notes,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        int totalQty = 0;
        decimal totalMrp = 0;
        decimal totalAmount = 0;

        foreach (var article in request.Articles)
        {
            var validSizes = article.Sizes.Where(s => s.Quantity > 0).ToList();
            if (!validSizes.Any()) continue;

            var lineId = Guid.NewGuid();
            var lineQty = 0;

            var orderLine = new OrderLine
            {
                OrderLineId = lineId,
                OrderId = order.Id,
                ArticleId = article.ArticleId,
                Color = article.Color,
                HSNCode = article.HSNCode,
                MRP = article.MRP,
                Quantity = 0,
                DispatchedQty = 0,
                LineTotal = 0,
                StockAvailable = true
            };

            foreach (var size in validSizes)
            {
                var stockEntry = await _context.Set<StockLedgerView>()
                    .FirstOrDefaultAsync(s =>
                        s.TenantId == tenantId
                        && s.WarehouseId == request.WarehouseId
                        && s.ArticleId == article.ArticleId
                        && s.EuroSize == size.EuroSize, ct);

                var closingStock = stockEntry?.ClosingStock ?? 0;

                var alreadyAllocated = await _context.Set<OrderSizeRun>()
                    .Where(sr => sr.OrderLine.ArticleId == article.ArticleId
                              && sr.EuroSize == size.EuroSize
                              && sr.OrderLine.Order.WarehouseId == request.WarehouseId
                              && sr.OrderLine.Order.TenantId == tenantId
                              && (sr.OrderLine.Order.Status == "Draft" || sr.OrderLine.Order.Status == "Confirmed"))
                    .SumAsync(sr => sr.Quantity, ct);

                var available = closingStock - alreadyAllocated;
                var sizeStockOk = available >= size.Quantity;

                orderLine.SizeRuns.Add(new OrderSizeRun
                {
                    OrderSizeRunId = Guid.NewGuid(),
                    OrderLineId = lineId,
                    EuroSize = size.EuroSize,
                    Quantity = size.Quantity,
                    StockAvailable = sizeStockOk
                });

                if (!sizeStockOk) orderLine.StockAvailable = false;
                lineQty += size.Quantity;
            }

            orderLine.Quantity = lineQty;
            orderLine.LineTotal = article.MRP * lineQty;
            order.Lines.Add(orderLine);

            totalQty += lineQty;
            totalMrp += article.MRP * lineQty;
            totalAmount += orderLine.LineTotal;
        }

        if (!order.Lines.Any())
            throw new ArgumentException("Order must have at least one line with quantity > 0");

        order.TotalQuantity = totalQty;
        order.TotalMRP = totalMrp;
        order.TotalAmount = totalAmount;

        _context.Set<CustomerOrder>().Add(order);
        await _context.SaveChangesAsync(ct);

        return await GetOrderByIdAsync(tenantId, order.Id, ct);
    }

    // ================================================================
    //  PUT /api/orders/{id} -- update a Draft order
    //  Replaces all existing lines and size runs.
    // ================================================================

    public async Task<OrderResponse> UpdateOrderAsync(
        Guid tenantId, Guid orderId, CreateSizeWiseOrderRequest request,
        CancellationToken ct = default)
    {
        // Load order WITHOUT lines to avoid EF navigation fixup issues during update
        var order = await _context.Set<CustomerOrder>()
            .FirstOrDefaultAsync(o => o.Id == orderId && o.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Order not found");

        if (order.Status != "Draft")
            throw new InvalidOperationException(
                $"Only Draft orders can be updated. Current status: {order.Status}");

        // Load and delete existing lines separately (avoid EF navigation collection interference)
        var existingLines = await _context.Set<OrderLine>()
            .Include(l => l.SizeRuns)
            .Where(l => l.OrderId == orderId)
            .ToListAsync(ct);
        foreach (var line in existingLines)
            _context.Set<OrderSizeRun>().RemoveRange(line.SizeRuns);
        _context.Set<OrderLine>().RemoveRange(existingLines);
        await _context.SaveChangesAsync(ct); // commit deletions; entities become Detached

        // Update header fields
        order.ClientId = request.ClientId;
        order.StoreId = request.StoreId;
        order.WarehouseId = request.WarehouseId;
        order.OrderDate = request.OrderDate == DateTime.MinValue ? DateTime.UtcNow : request.OrderDate;
        order.Channel = request.Channel;
        order.Notes = request.Notes;
        order.UpdatedAt = DateTime.UtcNow;

        int totalQty = 0;
        decimal totalMrp = 0;
        decimal totalAmount = 0;

        foreach (var article in request.Articles)
        {
            var validSizes = article.Sizes.Where(s => s.Quantity > 0).ToList();
            if (!validSizes.Any()) continue;

            var lineId = Guid.NewGuid();
            var lineQty = 0;

            var orderLine = new OrderLine
            {
                OrderLineId = lineId,
                OrderId = order.Id,
                ArticleId = article.ArticleId,
                Color = article.Color,
                HSNCode = article.HSNCode,
                MRP = article.MRP,
                Quantity = 0,
                DispatchedQty = 0,
                LineTotal = 0,
                StockAvailable = true
            };

            foreach (var size in validSizes)
            {
                var stockEntry = await _context.Set<StockLedgerView>()
                    .FirstOrDefaultAsync(s =>
                        s.TenantId == tenantId
                        && s.WarehouseId == request.WarehouseId
                        && s.ArticleId == article.ArticleId
                        && s.EuroSize == size.EuroSize, ct);

                var closingStock = stockEntry?.ClosingStock ?? 0;

                // Exclude current order from allocation check
                var alreadyAllocated = await _context.Set<OrderSizeRun>()
                    .Where(sr => sr.OrderLine.ArticleId == article.ArticleId
                              && sr.EuroSize == size.EuroSize
                              && sr.OrderLine.Order.WarehouseId == request.WarehouseId
                              && sr.OrderLine.Order.TenantId == tenantId
                              && sr.OrderLine.Order.Id != orderId
                              && (sr.OrderLine.Order.Status == "Draft" || sr.OrderLine.Order.Status == "Confirmed"))
                    .SumAsync(sr => sr.Quantity, ct);

                var available = closingStock - alreadyAllocated;
                var sizeStockOk = available >= size.Quantity;

                orderLine.SizeRuns.Add(new OrderSizeRun
                {
                    OrderSizeRunId = Guid.NewGuid(),
                    OrderLineId = lineId,
                    EuroSize = size.EuroSize,
                    Quantity = size.Quantity,
                    StockAvailable = sizeStockOk
                });

                if (!sizeStockOk) orderLine.StockAvailable = false;
                lineQty += size.Quantity;
            }

            orderLine.Quantity = lineQty;
            orderLine.LineTotal = article.MRP * lineQty;
            _context.Set<OrderLine>().Add(orderLine); // Add directly (avoid nav collection fixup)

            totalQty += lineQty;
            totalMrp += article.MRP * lineQty;
            totalAmount += orderLine.LineTotal;
        }

        if (totalQty == 0)
            throw new ArgumentException("Order must have at least one line with quantity > 0");

        order.TotalQuantity = totalQty;
        order.TotalMRP = totalMrp;
        order.TotalAmount = totalAmount;

        await _context.SaveChangesAsync(ct);
        return await GetOrderByIdAsync(tenantId, orderId, ct);
    }

    // ================================================================
    //  POST /api/orders/{id}/confirm -- confirm and deduct stock
    //  Deducts stock by incrementing OutwardQty in StockLedger.
    // ================================================================

    public async Task<OrderResponse> ConfirmOrderAsync(
        Guid tenantId, Guid userId, Guid orderId, CancellationToken ct = default)
    {
        var order = await _context.Set<CustomerOrder>()
            .Include(o => o.Lines)
                .ThenInclude(l => l.SizeRuns)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Order not found");

        if (order.Status != "Draft")
            throw new InvalidOperationException(
                $"Only Draft orders can be confirmed. Current status: {order.Status}");

        if (!order.Lines.Any())
            throw new InvalidOperationException("Order must have at least one line item");

        // Validate stock availability and deduct
        foreach (var line in order.Lines)
        {
            foreach (var sizeRun in line.SizeRuns)
            {
                var ledger = await _context.Set<StockLedgerView>()
                    .FirstOrDefaultAsync(s =>
                        s.TenantId == tenantId
                        && s.WarehouseId == order.WarehouseId
                        && s.ArticleId == line.ArticleId
                        && s.EuroSize == sizeRun.EuroSize, ct);

                if (ledger == null || ledger.ClosingStock < sizeRun.Quantity)
                {
                    throw new InvalidOperationException(
                        $"Insufficient stock for Article {line.ArticleId}, Size {sizeRun.EuroSize}. " +
                        $"Required: {sizeRun.Quantity}, Available: {ledger?.ClosingStock ?? 0}");
                }

                ledger.OutwardQty += sizeRun.Quantity;
                ledger.LastUpdated = DateTime.UtcNow;
                sizeRun.StockAvailable = true;
            }
            line.StockAvailable = true;
        }

        order.Status = "Confirmed";
        order.ConfirmedBy = userId;
        order.ConfirmedAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetOrderByIdAsync(tenantId, orderId, ct);
    }

    // ================================================================
    //  POST /api/orders/{id}/dispatch
    //  Status transitions: Confirmed -> Dispatched
    // ================================================================

    public async Task<OrderResponse> DispatchOrderAsync(
        Guid tenantId, Guid userId, Guid orderId, CancellationToken ct = default)
    {
        var order = await _context.Set<CustomerOrder>()
            .FirstOrDefaultAsync(o => o.Id == orderId && o.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Order not found");

        if (order.Status != "Confirmed")
            throw new InvalidOperationException(
                $"Only Confirmed orders can be dispatched. Current status: {order.Status}");

        order.Status = "Dispatched";
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetOrderByIdAsync(tenantId, orderId, ct);
    }

    // ================================================================
    //  POST /api/orders/{id}/cancel -- cancel and restore stock
    //  If order was Confirmed, reverses stock deduction.
    // ================================================================

    public async Task<OrderResponse> CancelOrderAsync(
        Guid tenantId, Guid userId, Guid orderId, string reason, CancellationToken ct = default)
    {
        var order = await _context.Set<CustomerOrder>()
            .Include(o => o.Lines)
                .ThenInclude(l => l.SizeRuns)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Order not found");

        if (order.Status is "Cancelled" or "Dispatched")
            throw new InvalidOperationException(
                $"Order cannot be cancelled. Current status: {order.Status}");

        var wasConfirmed = order.Status == "Confirmed";

        // If order was confirmed, reverse the stock deduction
        if (wasConfirmed)
        {
            foreach (var line in order.Lines)
            {
                foreach (var sizeRun in line.SizeRuns)
                {
                    var ledger = await _context.Set<StockLedgerView>()
                        .FirstOrDefaultAsync(s =>
                            s.TenantId == tenantId
                            && s.WarehouseId == order.WarehouseId
                            && s.ArticleId == line.ArticleId
                            && s.EuroSize == sizeRun.EuroSize, ct);

                    if (ledger != null)
                    {
                        ledger.OutwardQty = Math.Max(0, ledger.OutwardQty - sizeRun.Quantity);
                        ledger.LastUpdated = DateTime.UtcNow;
                    }
                }
            }
        }

        order.Status = "Cancelled";
        order.CancelledBy = userId;
        order.CancelledAt = DateTime.UtcNow;
        order.CancellationReason = reason;
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetOrderByIdAsync(tenantId, orderId, ct);
    }

    // ================================================================
    //  DELETE /api/orders/{id} -- delete Draft only
    // ================================================================

    public async Task DeleteOrderAsync(
        Guid tenantId, Guid orderId, CancellationToken ct = default)
    {
        var order = await _context.Set<CustomerOrder>()
            .Include(o => o.Lines)
                .ThenInclude(l => l.SizeRuns)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Order not found");

        if (order.Status != "Draft")
            throw new InvalidOperationException(
                $"Only Draft orders can be deleted. Current status: {order.Status}");

        foreach (var line in order.Lines)
            _context.Set<OrderSizeRun>().RemoveRange(line.SizeRuns);
        _context.Set<OrderLine>().RemoveRange(order.Lines);
        _context.Set<CustomerOrder>().Remove(order);
        await _context.SaveChangesAsync(ct);
    }

    // ================================================================
    //  Helpers
    // ================================================================

    /// <summary>
    /// Generates OrderNo in format: ORD-{year}-{sequential 3-digit}
    /// e.g., ORD-2026-001, ORD-2026-002
    /// </summary>
    private async Task<string> GenerateOrderNoAsync(Guid tenantId, CancellationToken ct)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"ORD-{year}-";

        var lastOrder = await _context.Set<CustomerOrder>()
            .Where(o => o.TenantId == tenantId && o.OrderNo.StartsWith(prefix))
            .OrderByDescending(o => o.OrderNo)
            .FirstOrDefaultAsync(ct);

        var sequence = 1;
        if (lastOrder != null)
        {
            var parts = lastOrder.OrderNo.Split('-');
            if (parts.Length == 3 && int.TryParse(parts[2], out var parsed))
                sequence = parsed + 1;
        }

        return $"{prefix}{sequence:D3}";
    }

    private static OrderResponse MapToResponse(CustomerOrder order) => new()
    {
        OrderId = order.Id,
        OrderNo = order.OrderNo,
        OrderDate = order.OrderDate,
        ClientId = order.ClientId,
        ClientName = order.Client?.ClientName ?? "",
        StoreId = order.StoreId,
        StoreName = order.Store?.StoreName ?? "",
        WarehouseId = order.WarehouseId,
        TotalQuantity = order.TotalQuantity,
        TotalMRP = order.TotalMRP,
        TotalAmount = order.TotalAmount,
        Status = order.Status,
        Channel = order.Channel,
        Notes = order.Notes,
        CreatedAt = order.CreatedAt,
        Lines = order.Lines.Select(l => new OrderLineResponse
        {
            OrderLineId = l.OrderLineId,
            ArticleId = l.ArticleId,
            Color = l.Color,
            HSNCode = l.HSNCode,
            MRP = l.MRP,
            Quantity = l.Quantity,
            DispatchedQty = l.DispatchedQty,
            LineTotal = l.LineTotal,
            StockAvailable = l.StockAvailable,
            SizeRuns = l.SizeRuns.Select(sr => new SizeRunResponse
            {
                OrderSizeRunId = sr.OrderSizeRunId,
                EuroSize = sr.EuroSize,
                Quantity = sr.Quantity,
                StockAvailable = sr.StockAvailable
            }).OrderBy(sr => sr.EuroSize).ToList()
        }).ToList()
    };
}
