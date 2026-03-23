using RetailERP.Inventory.Application.Services;
using RetailERP.Inventory.Domain.Entities;

namespace RetailERP.Inventory.Application.Services;

public interface IInventoryService
{
    // Existing stock operations
    Task<List<StockOverviewDto>> GetStockOverviewAsync(Guid tenantId, Guid? warehouseId, string? searchTerm, CancellationToken ct = default);
    Task<List<StockOverviewDto>> GetStockByWarehouseAsync(Guid tenantId, Guid warehouseId, CancellationToken ct = default);
    Task<StockAvailabilityDto> CheckAvailabilityAsync(Guid tenantId, Guid articleId, string? size, Guid? warehouseId, CancellationToken ct = default);
    Task<StockMovement> RecordMovementAsync(Guid tenantId, Guid userId, RecordMovementRequest request, CancellationToken ct = default);
    Task<List<StockMovementDto>> GetMovementsAsync(Guid tenantId, Guid? articleId, Guid? warehouseId, DateTime? from, DateTime? to, CancellationToken ct = default);

    // GRN operations
    Task<GRNResponse> CreateGRNAsync(Guid tenantId, Guid userId, CreateGRNRequest request, CancellationToken ct = default);
    Task<List<GRNResponse>> GetGRNsAsync(Guid tenantId, Guid? warehouseId, string? status, CancellationToken ct = default);
    Task<GRNResponse> GetGRNAsync(Guid tenantId, Guid grnId, CancellationToken ct = default);
    Task<GRNResponse> ConfirmGRNAsync(Guid tenantId, Guid grnId, Guid userId, CancellationToken ct = default);

    // Stock Freeze operations
    Task<List<StockFreezeResponse>> GetStockFreezesAsync(Guid tenantId, Guid? warehouseId, int? year, int? month, string? status, CancellationToken ct = default);
    Task<StockFreezeResponse> FreezeStockAsync(Guid tenantId, Guid warehouseId, int month, int year, Guid userId, CancellationToken ct = default);
    Task<List<StockFreezeHistoryResponse>> GetStockFreezeHistoryAsync(Guid tenantId, Guid? warehouseId, CancellationToken ct = default);

    // Stock Ledger / reporting
    Task<List<StockLedgerResponse>> GetStockLedgerAsync(Guid tenantId, Guid? warehouseId, int? month, int? year, CancellationToken ct = default);
    Task<ArticleWarehouseStockResponse> GetArticleStockByWarehouseAsync(Guid tenantId, Guid warehouseId, Guid articleId, CancellationToken ct = default);
}
