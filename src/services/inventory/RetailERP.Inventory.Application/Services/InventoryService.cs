using Microsoft.EntityFrameworkCore;
using RetailERP.Inventory.Domain.Entities;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Inventory.Application.Services;

public class InventoryService : IInventoryService
{
    private readonly DbContext _context;

    public InventoryService(DbContext context)
    {
        _context = context;
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Existing Stock Operations
    // ──────────────────────────────────────────────────────────────────────────

    public async Task<List<StockOverviewDto>> GetStockOverviewAsync(
        Guid tenantId, Guid? warehouseId, string? searchTerm, CancellationToken ct = default)
    {
        var query = _context.Set<StockLedger>()
            .Include(s => s.Warehouse)
            .Where(s => s.TenantId == tenantId);

        if (warehouseId.HasValue)
            query = query.Where(s => s.WarehouseId == warehouseId.Value);

        if (!string.IsNullOrWhiteSpace(searchTerm))
            query = query.Where(s => s.SKU.Contains(searchTerm));

        return await query.Select(s => new StockOverviewDto
        {
            StockLedgerId = s.Id,
            ArticleId = s.ArticleId,
            WarehouseId = s.WarehouseId,
            WarehouseName = s.Warehouse.WarehouseName,
            SKU = s.SKU,
            Size = s.Size,
            Color = s.Color,
            QuantityOnHand = s.QuantityOnHand,
            QuantityReserved = s.QuantityReserved,
            QuantityAvailable = s.QuantityOnHand - s.QuantityReserved,
            ReorderLevel = s.ReorderLevel
        }).ToListAsync(ct);
    }

    public async Task<List<StockOverviewDto>> GetStockByWarehouseAsync(
        Guid tenantId, Guid warehouseId, CancellationToken ct = default)
    {
        return await GetStockOverviewAsync(tenantId, warehouseId, null, ct);
    }

    public async Task<StockAvailabilityDto> CheckAvailabilityAsync(
        Guid tenantId, Guid articleId, string? size, Guid? warehouseId, CancellationToken ct = default)
    {
        var query = _context.Set<StockLedger>()
            .Where(s => s.TenantId == tenantId && s.ArticleId == articleId);

        if (!string.IsNullOrWhiteSpace(size))
            query = query.Where(s => s.Size == size);

        if (warehouseId.HasValue)
            query = query.Where(s => s.WarehouseId == warehouseId.Value);

        var stocks = await query.ToListAsync(ct);

        return new StockAvailabilityDto
        {
            ArticleId = articleId,
            TotalOnHand = stocks.Sum(s => s.QuantityOnHand),
            TotalReserved = stocks.Sum(s => s.QuantityReserved),
            TotalAvailable = stocks.Sum(s => s.QuantityAvailable),
            ByWarehouse = stocks.GroupBy(s => s.WarehouseId).Select(g => new WarehouseStockDto
            {
                WarehouseId = g.Key,
                QuantityOnHand = g.Sum(s => s.QuantityOnHand),
                QuantityReserved = g.Sum(s => s.QuantityReserved),
                QuantityAvailable = g.Sum(s => s.QuantityAvailable)
            }).ToList()
        };
    }

    public async Task<StockMovement> RecordMovementAsync(
        Guid tenantId, Guid userId, RecordMovementRequest request, CancellationToken ct = default)
    {
        var movement = new StockMovement
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ArticleId = request.ArticleId,
            WarehouseId = request.WarehouseId,
            SKU = request.SKU,
            Size = request.Size,
            Color = request.Color,
            MovementType = request.MovementType,
            Quantity = request.Quantity,
            ReferenceType = request.ReferenceType,
            ReferenceId = request.ReferenceId,
            ReferenceNumber = request.ReferenceNumber,
            Notes = request.Notes,
            MovementDate = DateTime.UtcNow,
            CreatedBy = userId
        };

        _context.Set<StockMovement>().Add(movement);

        // Update stock ledger
        var ledger = await _context.Set<StockLedger>()
            .FirstOrDefaultAsync(s =>
                s.TenantId == tenantId &&
                s.ArticleId == request.ArticleId &&
                s.WarehouseId == request.WarehouseId &&
                s.Size == request.Size &&
                s.Color == request.Color, ct);

        if (ledger == null)
        {
            ledger = new StockLedger
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ArticleId = request.ArticleId,
                WarehouseId = request.WarehouseId,
                SKU = request.SKU,
                Size = request.Size,
                Color = request.Color,
                QuantityOnHand = 0,
                CreatedBy = userId
            };
            _context.Set<StockLedger>().Add(ledger);
        }

        switch (request.MovementType.ToUpper())
        {
            case "IN":
                ledger.QuantityOnHand += request.Quantity;
                break;
            case "OUT":
                if (ledger.QuantityAvailable < request.Quantity)
                    throw new InvalidOperationException($"Insufficient stock. Available: {ledger.QuantityAvailable}, Requested: {request.Quantity}");
                ledger.QuantityOnHand -= request.Quantity;
                break;
            case "ADJUSTMENT":
                ledger.QuantityOnHand += request.Quantity; // Can be negative
                break;
            default:
                throw new ArgumentException($"Invalid movement type: {request.MovementType}");
        }

        ledger.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return movement;
    }

    public async Task<List<StockMovementDto>> GetMovementsAsync(
        Guid tenantId, Guid? articleId, Guid? warehouseId, DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var query = _context.Set<StockMovement>()
            .Include(m => m.Warehouse)
            .Where(m => m.TenantId == tenantId);

        if (articleId.HasValue) query = query.Where(m => m.ArticleId == articleId.Value);
        if (warehouseId.HasValue) query = query.Where(m => m.WarehouseId == warehouseId.Value);
        if (from.HasValue) query = query.Where(m => m.MovementDate >= from.Value);
        if (to.HasValue) query = query.Where(m => m.MovementDate <= to.Value);

        return await query.OrderByDescending(m => m.MovementDate)
            .Select(m => new StockMovementDto
            {
                MovementId = m.Id,
                ArticleId = m.ArticleId,
                WarehouseId = m.WarehouseId,
                WarehouseName = m.Warehouse.WarehouseName,
                SKU = m.SKU,
                Size = m.Size,
                Color = m.Color,
                MovementType = m.MovementType,
                Quantity = m.Quantity,
                ReferenceType = m.ReferenceType,
                ReferenceNumber = m.ReferenceNumber,
                Notes = m.Notes,
                MovementDate = m.MovementDate
            }).ToListAsync(ct);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  GRN Operations
    // ──────────────────────────────────────────────────────────────────────────

    public async Task<GRNResponse> CreateGRNAsync(
        Guid tenantId, Guid userId, CreateGRNRequest request, CancellationToken ct = default)
    {
        // Generate GRN number: GRN-YYYYMMDD-XXXX
        var today = DateTime.UtcNow;
        var prefix = $"GRN-{today:yyyyMMdd}-";
        var lastGrn = await _context.Set<GoodsReceivedNote>()
            .Where(g => g.TenantId == tenantId && g.GRNNumber.StartsWith(prefix))
            .OrderByDescending(g => g.GRNNumber)
            .FirstOrDefaultAsync(ct);

        var sequence = 1;
        if (lastGrn != null)
        {
            var lastSeq = lastGrn.GRNNumber.Replace(prefix, "");
            if (int.TryParse(lastSeq, out var parsed))
                sequence = parsed + 1;
        }

        var grnNumber = $"{prefix}{sequence:D4}";

        var grn = new GoodsReceivedNote
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            GRNNumber = grnNumber,
            WarehouseId = request.WarehouseId,
            ReceiptDate = request.ReceiptDate ?? DateTime.UtcNow,
            SourceType = request.SourceType,
            ReferenceNo = request.ReferenceNo,
            Status = "Draft",
            Notes = request.Notes,
            TotalQuantity = request.Lines.Sum(l => l.Quantity),
            CreatedBy = userId
        };

        foreach (var line in request.Lines)
        {
            grn.Lines.Add(new GRNLine
            {
                GRNLineId = Guid.NewGuid(),
                GRNId = grn.Id,
                ArticleId = line.ArticleId,
                EuroSize = line.EuroSize,
                Quantity = line.Quantity
            });
        }

        _context.Set<GoodsReceivedNote>().Add(grn);
        await _context.SaveChangesAsync(ct);

        return MapToGRNResponse(grn);
    }

    public async Task<List<GRNResponse>> GetGRNsAsync(
        Guid tenantId, Guid? warehouseId, string? status, CancellationToken ct = default)
    {
        var query = _context.Set<GoodsReceivedNote>()
            .Include(g => g.Lines)
            .Include(g => g.Warehouse)
            .Where(g => g.TenantId == tenantId);

        if (warehouseId.HasValue)
            query = query.Where(g => g.WarehouseId == warehouseId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(g => g.Status == status);

        var grns = await query
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync(ct);

        return grns.Select(MapToGRNResponse).ToList();
    }

    public async Task<GRNResponse> GetGRNAsync(
        Guid tenantId, Guid grnId, CancellationToken ct = default)
    {
        var grn = await _context.Set<GoodsReceivedNote>()
            .Include(g => g.Lines)
            .Include(g => g.Warehouse)
            .FirstOrDefaultAsync(g => g.Id == grnId && g.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"GRN with ID {grnId} not found");

        return MapToGRNResponse(grn);
    }

    public async Task<GRNResponse> ConfirmGRNAsync(
        Guid tenantId, Guid grnId, Guid userId, CancellationToken ct = default)
    {
        var grn = await _context.Set<GoodsReceivedNote>()
            .Include(g => g.Lines)
            .Include(g => g.Warehouse)
            .FirstOrDefaultAsync(g => g.Id == grnId && g.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"GRN with ID {grnId} not found");

        if (grn.Status != "Draft")
            throw new InvalidOperationException($"GRN can only be confirmed from Draft status. Current status: {grn.Status}");

        grn.Status = "Confirmed";
        grn.UpdatedAt = DateTime.UtcNow;

        // Add stock movements for each GRN line
        foreach (var line in grn.Lines)
        {
            var movement = new StockMovement
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ArticleId = line.ArticleId,
                WarehouseId = grn.WarehouseId,
                SKU = string.Empty,
                Size = line.EuroSize,
                MovementType = "IN",
                Quantity = line.Quantity,
                ReferenceType = "GRN",
                ReferenceId = grn.Id,
                ReferenceNumber = grn.GRNNumber,
                Notes = $"GRN confirmed: {grn.GRNNumber}",
                MovementDate = DateTime.UtcNow,
                CreatedBy = userId
            };
            _context.Set<StockMovement>().Add(movement);

            // Update stock ledger
            var ledger = await _context.Set<StockLedger>()
                .FirstOrDefaultAsync(s =>
                    s.TenantId == tenantId &&
                    s.ArticleId == line.ArticleId &&
                    s.WarehouseId == grn.WarehouseId &&
                    s.Size == line.EuroSize, ct);

            if (ledger == null)
            {
                ledger = new StockLedger
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    ArticleId = line.ArticleId,
                    WarehouseId = grn.WarehouseId,
                    SKU = string.Empty,
                    Size = line.EuroSize,
                    QuantityOnHand = 0,
                    CreatedBy = userId
                };
                _context.Set<StockLedger>().Add(ledger);
            }

            ledger.QuantityOnHand += line.Quantity;
            ledger.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(ct);
        return MapToGRNResponse(grn);
    }

    private static GRNResponse MapToGRNResponse(GoodsReceivedNote grn)
    {
        return new GRNResponse
        {
            GRNId = grn.Id,
            GRNNumber = grn.GRNNumber,
            WarehouseId = grn.WarehouseId,
            WarehouseName = grn.Warehouse?.WarehouseName ?? string.Empty,
            ReceiptDate = grn.ReceiptDate,
            SourceType = grn.SourceType,
            ReferenceNo = grn.ReferenceNo,
            Status = grn.Status,
            Notes = grn.Notes,
            TotalQuantity = grn.TotalQuantity,
            CreatedAt = grn.CreatedAt,
            Lines = grn.Lines.Select(l => new GRNLineDto
            {
                GRNLineId = l.GRNLineId,
                ArticleId = l.ArticleId,
                EuroSize = l.EuroSize,
                Quantity = l.Quantity
            }).ToList()
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Stock Freeze Operations
    // ──────────────────────────────────────────────────────────────────────────

    public async Task<List<StockFreezeResponse>> GetStockFreezesAsync(
        Guid tenantId, Guid? warehouseId, int? year, int? month, string? status, CancellationToken ct = default)
    {
        var query = _context.Set<StockFreeze>()
            .Include(f => f.Warehouse)
            .Include(f => f.Lines)
            .Where(f => f.TenantId == tenantId);

        if (warehouseId.HasValue)
            query = query.Where(f => f.WarehouseId == warehouseId.Value);
        if (year.HasValue)
            query = query.Where(f => f.FreezeYear == year.Value);
        if (month.HasValue)
            query = query.Where(f => f.FreezeMonth == month.Value);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(f => f.Status == status);

        var freezes = await query
            .OrderByDescending(f => f.FreezeYear)
            .ThenByDescending(f => f.FreezeMonth)
            .ToListAsync(ct);

        return freezes.Select(MapToStockFreezeResponse).ToList();
    }

    public async Task<StockFreezeResponse> FreezeStockAsync(
        Guid tenantId, Guid warehouseId, int month, int year, Guid userId, CancellationToken ct = default)
    {
        // Check if a freeze already exists for this warehouse/month/year
        var existing = await _context.Set<StockFreeze>()
            .FirstOrDefaultAsync(f =>
                f.TenantId == tenantId &&
                f.WarehouseId == warehouseId &&
                f.FreezeMonth == month &&
                f.FreezeYear == year, ct);

        if (existing != null)
            throw new InvalidOperationException($"Stock freeze already exists for warehouse in {month}/{year}. Status: {existing.Status}");

        // Get the previous month's freeze to use as opening balances
        var prevMonth = month == 1 ? 12 : month - 1;
        var prevYear = month == 1 ? year - 1 : year;

        var previousFreeze = await _context.Set<StockFreeze>()
            .Include(f => f.Lines)
            .FirstOrDefaultAsync(f =>
                f.TenantId == tenantId &&
                f.WarehouseId == warehouseId &&
                f.FreezeMonth == prevMonth &&
                f.FreezeYear == prevYear &&
                f.Status == "Frozen", ct);

        // Build a lookup of closing balances from the previous freeze
        var previousClosing = new Dictionary<(Guid ArticleId, string? Size), (int Qty, decimal Value)>();
        if (previousFreeze != null)
        {
            foreach (var pl in previousFreeze.Lines)
            {
                previousClosing[(pl.ArticleId, pl.EuroSize)] = (pl.ClosingQty, pl.ClosingValue);
            }
        }

        // Get all stock movements for this warehouse during the target month
        var monthStart = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1);

        var movements = await _context.Set<StockMovement>()
            .Where(m =>
                m.TenantId == tenantId &&
                m.WarehouseId == warehouseId &&
                m.MovementDate >= monthStart &&
                m.MovementDate < monthEnd)
            .ToListAsync(ct);

        // Group movements by article + size
        var movementGroups = movements
            .GroupBy(m => new { m.ArticleId, Size = m.Size })
            .ToList();

        // Also get all current stock ledger entries for this warehouse to capture articles
        // that may not have had movements this month but had previous closing
        var currentStock = await _context.Set<StockLedger>()
            .Where(s => s.TenantId == tenantId && s.WarehouseId == warehouseId)
            .ToListAsync(ct);

        // Collect all unique article/size combos
        var allKeys = new HashSet<(Guid ArticleId, string? Size)>();
        foreach (var g in movementGroups)
            allKeys.Add((g.Key.ArticleId, g.Key.Size));
        foreach (var key in previousClosing.Keys)
            allKeys.Add(key);
        foreach (var s in currentStock)
            allKeys.Add((s.ArticleId, s.Size));

        var freeze = new StockFreeze
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            WarehouseId = warehouseId,
            FreezeMonth = month,
            FreezeYear = year,
            Status = "Frozen",
            FrozenAt = DateTime.UtcNow,
            FrozenBy = userId,
            CreatedBy = userId
        };

        foreach (var key in allKeys)
        {
            var articleMovements = movements
                .Where(m => m.ArticleId == key.ArticleId && m.Size == key.Size)
                .ToList();

            previousClosing.TryGetValue(key, out var prevClosing);
            var openingQty = prevClosing.Qty;
            var openingValue = prevClosing.Value;

            // Categorize movements by reference type
            var received = articleMovements.Where(m => m.MovementType.Equals("IN", StringComparison.OrdinalIgnoreCase)
                && (m.ReferenceType == null || m.ReferenceType.Equals("PO", StringComparison.OrdinalIgnoreCase)
                    || m.ReferenceType.Equals("GRN", StringComparison.OrdinalIgnoreCase)
                    || m.ReferenceType.Equals("PRODUCTION", StringComparison.OrdinalIgnoreCase)));

            var issued = articleMovements.Where(m => m.MovementType.Equals("OUT", StringComparison.OrdinalIgnoreCase)
                && (m.ReferenceType == null || m.ReferenceType.Equals("SO", StringComparison.OrdinalIgnoreCase)
                    || m.ReferenceType.Equals("SALE", StringComparison.OrdinalIgnoreCase)));

            var returns = articleMovements.Where(m =>
                m.ReferenceType != null && m.ReferenceType.Equals("RETURN", StringComparison.OrdinalIgnoreCase));

            var handloanIn = articleMovements.Where(m =>
                m.ReferenceType != null && m.ReferenceType.Equals("HANDLOAN_IN", StringComparison.OrdinalIgnoreCase));

            var handloanOut = articleMovements.Where(m =>
                m.ReferenceType != null && m.ReferenceType.Equals("HANDLOAN_OUT", StringComparison.OrdinalIgnoreCase));

            var jobworkIn = articleMovements.Where(m =>
                m.ReferenceType != null && m.ReferenceType.Equals("JOBWORK_IN", StringComparison.OrdinalIgnoreCase));

            var jobworkOut = articleMovements.Where(m =>
                m.ReferenceType != null && m.ReferenceType.Equals("JOBWORK_OUT", StringComparison.OrdinalIgnoreCase));

            var receivedQty = received.Sum(m => m.Quantity);
            var issuedQty = issued.Sum(m => m.Quantity);
            var returnQty = returns.Sum(m => m.Quantity);
            var handloanInQty = handloanIn.Sum(m => m.Quantity);
            var handloanOutQty = handloanOut.Sum(m => m.Quantity);
            var jobworkInQty = jobworkIn.Sum(m => m.Quantity);
            var jobworkOutQty = jobworkOut.Sum(m => m.Quantity);

            var closingQty = openingQty + receivedQty - issuedQty + returnQty
                + handloanInQty - handloanOutQty + jobworkInQty - jobworkOutQty;

            freeze.Lines.Add(new StockFreezeLine
            {
                FreezeLineId = Guid.NewGuid(),
                FreezeId = freeze.Id,
                ArticleId = key.ArticleId,
                EuroSize = key.Size,
                OpeningQty = openingQty,
                OpeningValue = openingValue,
                ReceivedQty = receivedQty,
                ReceivedValue = 0, // Value tracking requires pricing integration
                IssuedQty = issuedQty,
                IssuedValue = 0,
                ReturnQty = returnQty,
                ReturnValue = 0,
                HandloanInQty = handloanInQty,
                HandloanInValue = 0,
                HandloanOutQty = handloanOutQty,
                HandloanOutValue = 0,
                JobworkInQty = jobworkInQty,
                JobworkInValue = 0,
                JobworkOutQty = jobworkOutQty,
                JobworkOutValue = 0,
                ClosingQty = closingQty,
                ClosingValue = 0
            });
        }

        _context.Set<StockFreeze>().Add(freeze);
        await _context.SaveChangesAsync(ct);

        // Reload with warehouse navigation for response
        var saved = await _context.Set<StockFreeze>()
            .Include(f => f.Warehouse)
            .Include(f => f.Lines)
            .FirstAsync(f => f.Id == freeze.Id, ct);

        return MapToStockFreezeResponse(saved);
    }

    public async Task<List<StockFreezeHistoryResponse>> GetStockFreezeHistoryAsync(
        Guid tenantId, Guid? warehouseId, CancellationToken ct = default)
    {
        var query = _context.Set<StockFreeze>()
            .Include(f => f.Warehouse)
            .Where(f => f.TenantId == tenantId && f.Status == "Frozen");

        if (warehouseId.HasValue)
            query = query.Where(f => f.WarehouseId == warehouseId.Value);

        var freezes = await query
            .OrderByDescending(f => f.FreezeYear)
            .ThenByDescending(f => f.FreezeMonth)
            .ToListAsync(ct);

        return freezes.Select(f => new StockFreezeHistoryResponse
        {
            FreezeId = f.Id,
            WarehouseId = f.WarehouseId,
            WarehouseName = f.Warehouse?.WarehouseName ?? string.Empty,
            FreezeMonth = f.FreezeMonth,
            FreezeYear = f.FreezeYear,
            Status = f.Status,
            FrozenAt = f.FrozenAt,
            FrozenBy = f.FrozenBy
        }).ToList();
    }

    private static StockFreezeResponse MapToStockFreezeResponse(StockFreeze freeze)
    {
        return new StockFreezeResponse
        {
            FreezeId = freeze.Id,
            WarehouseId = freeze.WarehouseId,
            WarehouseName = freeze.Warehouse?.WarehouseName ?? string.Empty,
            FreezeMonth = freeze.FreezeMonth,
            FreezeYear = freeze.FreezeYear,
            Status = freeze.Status,
            FrozenAt = freeze.FrozenAt,
            FrozenBy = freeze.FrozenBy,
            CreatedAt = freeze.CreatedAt,
            Lines = freeze.Lines.Select(l => new StockFreezeLineDto
            {
                FreezeLineId = l.FreezeLineId,
                ArticleId = l.ArticleId,
                EuroSize = l.EuroSize,
                OpeningQty = l.OpeningQty,
                OpeningValue = l.OpeningValue,
                ReceivedQty = l.ReceivedQty,
                ReceivedValue = l.ReceivedValue,
                IssuedQty = l.IssuedQty,
                IssuedValue = l.IssuedValue,
                ReturnQty = l.ReturnQty,
                ReturnValue = l.ReturnValue,
                HandloanInQty = l.HandloanInQty,
                HandloanInValue = l.HandloanInValue,
                HandloanOutQty = l.HandloanOutQty,
                HandloanOutValue = l.HandloanOutValue,
                JobworkInQty = l.JobworkInQty,
                JobworkInValue = l.JobworkInValue,
                JobworkOutQty = l.JobworkOutQty,
                JobworkOutValue = l.JobworkOutValue,
                ClosingQty = l.ClosingQty,
                ClosingValue = l.ClosingValue
            }).ToList()
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Stock Ledger / Reporting Operations
    // ──────────────────────────────────────────────────────────────────────────

    public async Task<List<StockLedgerResponse>> GetStockLedgerAsync(
        Guid tenantId, Guid? warehouseId, int? month, int? year, CancellationToken ct = default)
    {
        // If a specific month/year is requested and a frozen snapshot exists, return from freeze
        if (month.HasValue && year.HasValue)
        {
            var freezeQuery = _context.Set<StockFreeze>()
                .Include(f => f.Warehouse)
                .Include(f => f.Lines)
                .Where(f =>
                    f.TenantId == tenantId &&
                    f.FreezeMonth == month.Value &&
                    f.FreezeYear == year.Value &&
                    f.Status == "Frozen");

            if (warehouseId.HasValue)
                freezeQuery = freezeQuery.Where(f => f.WarehouseId == warehouseId.Value);

            var frozenData = await freezeQuery.ToListAsync(ct);

            if (frozenData.Any())
            {
                return frozenData.SelectMany(f => f.Lines.Select(l => new StockLedgerResponse
                {
                    ArticleId = l.ArticleId,
                    EuroSize = l.EuroSize,
                    WarehouseId = f.WarehouseId,
                    WarehouseName = f.Warehouse?.WarehouseName ?? string.Empty,
                    Month = f.FreezeMonth,
                    Year = f.FreezeYear,
                    OpeningQty = l.OpeningQty,
                    OpeningValue = l.OpeningValue,
                    ReceivedQty = l.ReceivedQty,
                    ReceivedValue = l.ReceivedValue,
                    IssuedQty = l.IssuedQty,
                    IssuedValue = l.IssuedValue,
                    ReturnQty = l.ReturnQty,
                    ReturnValue = l.ReturnValue,
                    HandloanInQty = l.HandloanInQty,
                    HandloanInValue = l.HandloanInValue,
                    HandloanOutQty = l.HandloanOutQty,
                    HandloanOutValue = l.HandloanOutValue,
                    JobworkInQty = l.JobworkInQty,
                    JobworkInValue = l.JobworkInValue,
                    JobworkOutQty = l.JobworkOutQty,
                    JobworkOutValue = l.JobworkOutValue,
                    ClosingQty = l.ClosingQty,
                    ClosingValue = l.ClosingValue,
                    IsFrozen = true
                })).ToList();
            }
        }

        // Otherwise compute a live ledger from movements
        var targetMonth = month ?? DateTime.UtcNow.Month;
        var targetYear = year ?? DateTime.UtcNow.Year;
        var monthStart = new DateTime(targetYear, targetMonth, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1);

        // Get previous month's freeze for opening balances
        var prevMonth = targetMonth == 1 ? 12 : targetMonth - 1;
        var prevYear = targetMonth == 1 ? targetYear - 1 : targetYear;

        var prevFreezeQuery = _context.Set<StockFreeze>()
            .Include(f => f.Lines)
            .Where(f =>
                f.TenantId == tenantId &&
                f.FreezeMonth == prevMonth &&
                f.FreezeYear == prevYear &&
                f.Status == "Frozen");

        if (warehouseId.HasValue)
            prevFreezeQuery = prevFreezeQuery.Where(f => f.WarehouseId == warehouseId.Value);

        var prevFreezes = await prevFreezeQuery.ToListAsync(ct);

        var openingLookup = new Dictionary<(Guid WarehouseId, Guid ArticleId, string? Size), (int Qty, decimal Value)>();
        foreach (var pf in prevFreezes)
        {
            foreach (var pl in pf.Lines)
            {
                openingLookup[(pf.WarehouseId, pl.ArticleId, pl.EuroSize)] = (pl.ClosingQty, pl.ClosingValue);
            }
        }

        // Get movements for the target month
        var movementQuery = _context.Set<StockMovement>()
            .Include(m => m.Warehouse)
            .Where(m =>
                m.TenantId == tenantId &&
                m.MovementDate >= monthStart &&
                m.MovementDate < monthEnd);

        if (warehouseId.HasValue)
            movementQuery = movementQuery.Where(m => m.WarehouseId == warehouseId.Value);

        var allMovements = await movementQuery.ToListAsync(ct);

        var groups = allMovements
            .GroupBy(m => new { m.WarehouseId, m.ArticleId, Size = m.Size })
            .ToList();

        // Collect all unique keys
        var allKeys = new HashSet<(Guid WarehouseId, Guid ArticleId, string? Size)>();
        foreach (var g in groups)
            allKeys.Add((g.Key.WarehouseId, g.Key.ArticleId, g.Key.Size));
        foreach (var key in openingLookup.Keys)
            allKeys.Add(key);

        // Get warehouse names
        var warehouseIds = allKeys.Select(k => k.WarehouseId).Distinct().ToList();
        var warehouses = await _context.Set<Warehouse>()
            .Where(w => warehouseIds.Contains(w.Id))
            .ToDictionaryAsync(w => w.Id, w => w.WarehouseName, ct);

        var result = new List<StockLedgerResponse>();

        foreach (var key in allKeys)
        {
            var articleMovements = allMovements
                .Where(m => m.WarehouseId == key.WarehouseId && m.ArticleId == key.ArticleId && m.Size == key.Size)
                .ToList();

            openingLookup.TryGetValue(key, out var prevClosing);
            var openingQty = prevClosing.Qty;
            var openingValue = prevClosing.Value;

            var received = articleMovements.Where(m => m.MovementType.Equals("IN", StringComparison.OrdinalIgnoreCase)
                && (m.ReferenceType == null || m.ReferenceType.Equals("PO", StringComparison.OrdinalIgnoreCase)
                    || m.ReferenceType.Equals("GRN", StringComparison.OrdinalIgnoreCase)
                    || m.ReferenceType.Equals("PRODUCTION", StringComparison.OrdinalIgnoreCase)));
            var issued = articleMovements.Where(m => m.MovementType.Equals("OUT", StringComparison.OrdinalIgnoreCase)
                && (m.ReferenceType == null || m.ReferenceType.Equals("SO", StringComparison.OrdinalIgnoreCase)
                    || m.ReferenceType.Equals("SALE", StringComparison.OrdinalIgnoreCase)));
            var returns = articleMovements.Where(m =>
                m.ReferenceType != null && m.ReferenceType.Equals("RETURN", StringComparison.OrdinalIgnoreCase));
            var handloanIn = articleMovements.Where(m =>
                m.ReferenceType != null && m.ReferenceType.Equals("HANDLOAN_IN", StringComparison.OrdinalIgnoreCase));
            var handloanOut = articleMovements.Where(m =>
                m.ReferenceType != null && m.ReferenceType.Equals("HANDLOAN_OUT", StringComparison.OrdinalIgnoreCase));
            var jobworkIn = articleMovements.Where(m =>
                m.ReferenceType != null && m.ReferenceType.Equals("JOBWORK_IN", StringComparison.OrdinalIgnoreCase));
            var jobworkOut = articleMovements.Where(m =>
                m.ReferenceType != null && m.ReferenceType.Equals("JOBWORK_OUT", StringComparison.OrdinalIgnoreCase));

            var receivedQty = received.Sum(m => m.Quantity);
            var issuedQty = issued.Sum(m => m.Quantity);
            var returnQty = returns.Sum(m => m.Quantity);
            var handloanInQty = handloanIn.Sum(m => m.Quantity);
            var handloanOutQty = handloanOut.Sum(m => m.Quantity);
            var jobworkInQty = jobworkIn.Sum(m => m.Quantity);
            var jobworkOutQty = jobworkOut.Sum(m => m.Quantity);

            var closingQty = openingQty + receivedQty - issuedQty + returnQty
                + handloanInQty - handloanOutQty + jobworkInQty - jobworkOutQty;

            warehouses.TryGetValue(key.WarehouseId, out var warehouseName);

            result.Add(new StockLedgerResponse
            {
                ArticleId = key.ArticleId,
                EuroSize = key.Size,
                WarehouseId = key.WarehouseId,
                WarehouseName = warehouseName ?? string.Empty,
                Month = targetMonth,
                Year = targetYear,
                OpeningQty = openingQty,
                OpeningValue = openingValue,
                ReceivedQty = receivedQty,
                ReceivedValue = 0,
                IssuedQty = issuedQty,
                IssuedValue = 0,
                ReturnQty = returnQty,
                ReturnValue = 0,
                HandloanInQty = handloanInQty,
                HandloanInValue = 0,
                HandloanOutQty = handloanOutQty,
                HandloanOutValue = 0,
                JobworkInQty = jobworkInQty,
                JobworkInValue = 0,
                JobworkOutQty = jobworkOutQty,
                JobworkOutValue = 0,
                ClosingQty = closingQty,
                ClosingValue = 0,
                IsFrozen = false
            });
        }

        return result;
    }

    public async Task<ArticleWarehouseStockResponse> GetArticleStockByWarehouseAsync(
        Guid tenantId, Guid warehouseId, Guid articleId, CancellationToken ct = default)
    {
        var stocks = await _context.Set<StockLedger>()
            .Include(s => s.Warehouse)
            .Where(s =>
                s.TenantId == tenantId &&
                s.WarehouseId == warehouseId &&
                s.ArticleId == articleId)
            .ToListAsync(ct);

        var warehouseName = stocks.FirstOrDefault()?.Warehouse?.WarehouseName ?? string.Empty;

        return new ArticleWarehouseStockResponse
        {
            ArticleId = articleId,
            WarehouseId = warehouseId,
            WarehouseName = warehouseName,
            TotalOnHand = stocks.Sum(s => s.QuantityOnHand),
            TotalReserved = stocks.Sum(s => s.QuantityReserved),
            TotalAvailable = stocks.Sum(s => s.QuantityAvailable),
            SizeBreakdown = stocks.Select(s => new SizeStockDto
            {
                Size = s.Size,
                Color = s.Color,
                QuantityOnHand = s.QuantityOnHand,
                QuantityReserved = s.QuantityReserved,
                QuantityAvailable = s.QuantityAvailable
            }).OrderBy(s => s.Size).ToList()
        };
    }
}

// ──────────────────────────────────────────────────────────────────────────────
//  Existing DTOs
// ──────────────────────────────────────────────────────────────────────────────

public class StockOverviewDto
{
    public Guid StockLedgerId { get; set; }
    public Guid ArticleId { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string? Size { get; set; }
    public string? Color { get; set; }
    public int QuantityOnHand { get; set; }
    public int QuantityReserved { get; set; }
    public int QuantityAvailable { get; set; }
    public int ReorderLevel { get; set; }
}

public class StockAvailabilityDto
{
    public Guid ArticleId { get; set; }
    public int TotalOnHand { get; set; }
    public int TotalReserved { get; set; }
    public int TotalAvailable { get; set; }
    public List<WarehouseStockDto> ByWarehouse { get; set; } = new();
}

public class WarehouseStockDto
{
    public Guid WarehouseId { get; set; }
    public int QuantityOnHand { get; set; }
    public int QuantityReserved { get; set; }
    public int QuantityAvailable { get; set; }
}

public class StockMovementDto
{
    public Guid MovementId { get; set; }
    public Guid ArticleId { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string MovementType { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string? ReferenceType { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public DateTime MovementDate { get; set; }
}

public class RecordMovementRequest
{
    public Guid ArticleId { get; set; }
    public Guid WarehouseId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string MovementType { get; set; } = string.Empty; // IN, OUT, ADJUSTMENT
    public int Quantity { get; set; }
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
}

// ──────────────────────────────────────────────────────────────────────────────
//  GRN DTOs
// ──────────────────────────────────────────────────────────────────────────────

public class CreateGRNRequest
{
    public Guid WarehouseId { get; set; }
    public DateTime? ReceiptDate { get; set; }
    public string SourceType { get; set; } = string.Empty; // PO, Transfer, Return, Production
    public string? ReferenceNo { get; set; }
    public string? Notes { get; set; }
    public List<CreateGRNLineRequest> Lines { get; set; } = new();
}

public class CreateGRNLineRequest
{
    public Guid ArticleId { get; set; }
    public string? EuroSize { get; set; }
    public int Quantity { get; set; }
}

public class GRNResponse
{
    public Guid GRNId { get; set; }
    public string GRNNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public DateTime ReceiptDate { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public string? ReferenceNo { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public int TotalQuantity { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<GRNLineDto> Lines { get; set; } = new();
}

public class GRNLineDto
{
    public Guid GRNLineId { get; set; }
    public Guid ArticleId { get; set; }
    public string? EuroSize { get; set; }
    public int Quantity { get; set; }
}

// ──────────────────────────────────────────────────────────────────────────────
//  Stock Freeze DTOs
// ──────────────────────────────────────────────────────────────────────────────

public class CreateStockFreezeRequest
{
    public Guid WarehouseId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
}

public class StockFreezeResponse
{
    public Guid FreezeId { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int FreezeMonth { get; set; }
    public int FreezeYear { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? FrozenAt { get; set; }
    public Guid? FrozenBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<StockFreezeLineDto> Lines { get; set; } = new();
}

public class StockFreezeLineDto
{
    public Guid FreezeLineId { get; set; }
    public Guid ArticleId { get; set; }
    public string? EuroSize { get; set; }
    public int OpeningQty { get; set; }
    public decimal OpeningValue { get; set; }
    public int ReceivedQty { get; set; }
    public decimal ReceivedValue { get; set; }
    public int IssuedQty { get; set; }
    public decimal IssuedValue { get; set; }
    public int ReturnQty { get; set; }
    public decimal ReturnValue { get; set; }
    public int HandloanInQty { get; set; }
    public decimal HandloanInValue { get; set; }
    public int HandloanOutQty { get; set; }
    public decimal HandloanOutValue { get; set; }
    public int JobworkInQty { get; set; }
    public decimal JobworkInValue { get; set; }
    public int JobworkOutQty { get; set; }
    public decimal JobworkOutValue { get; set; }
    public int ClosingQty { get; set; }
    public decimal ClosingValue { get; set; }
}

public class StockFreezeHistoryResponse
{
    public Guid FreezeId { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int FreezeMonth { get; set; }
    public int FreezeYear { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? FrozenAt { get; set; }
    public Guid? FrozenBy { get; set; }
}

// ──────────────────────────────────────────────────────────────────────────────
//  Stock Ledger / Reporting DTOs
// ──────────────────────────────────────────────────────────────────────────────

public class StockLedgerResponse
{
    public Guid ArticleId { get; set; }
    public string? EuroSize { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }

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

public class ArticleWarehouseStockResponse
{
    public Guid ArticleId { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int TotalOnHand { get; set; }
    public int TotalReserved { get; set; }
    public int TotalAvailable { get; set; }
    public List<SizeStockDto> SizeBreakdown { get; set; } = new();
}

public class SizeStockDto
{
    public string? Size { get; set; }
    public string? Color { get; set; }
    public int QuantityOnHand { get; set; }
    public int QuantityReserved { get; set; }
    public int QuantityAvailable { get; set; }
}
