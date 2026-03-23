using RetailERP.Shared.Contracts.Common;
using RetailERP.Shared.Contracts.Order;

namespace RetailERP.Order.Application.Interfaces;

public interface IOrderService
{
    /// <summary>
    /// List orders with pagination, search, status, client, store, and date filters.
    /// Includes size run summary counts per order.
    /// </summary>
    Task<PagedResult<OrderListResponse>> GetOrdersAsync(
        Guid tenantId, OrderQueryParams query, CancellationToken ct = default);

    /// <summary>
    /// Get a single order with all lines and full size run details.
    /// </summary>
    Task<OrderResponse> GetOrderByIdAsync(
        Guid tenantId, Guid orderId, CancellationToken ct = default);

    /// <summary>
    /// Get per-size stock position for an article in a specific warehouse.
    /// Shows warehouse stock, customer-allocated quantities, and available balance.
    /// </summary>
    Task<StockPositionResponse> GetArticleStockAsync(
        Guid tenantId, Guid warehouseId, Guid articleId, CancellationToken ct = default);

    /// <summary>
    /// Create a new size-wise customer order.
    /// Each article becomes one OrderLine, with multiple OrderSizeRun records per size.
    /// TotalQuantity on the line = sum of all SizeRun quantities.
    /// Auto-generates OrderNo in format ORD-{year}-{sequential 3-digit}.
    /// </summary>
    Task<OrderResponse> CreateOrderAsync(
        Guid tenantId, Guid userId, CreateSizeWiseOrderRequest request,
        CancellationToken ct = default);

    /// <summary>
    /// Update a Draft order with new lines and size runs.
    /// Replaces all existing lines and size runs.
    /// </summary>
    Task<OrderResponse> UpdateOrderAsync(
        Guid tenantId, Guid orderId, CreateSizeWiseOrderRequest request,
        CancellationToken ct = default);

    /// <summary>
    /// Confirm a Draft order. Transitions status to Confirmed.
    /// </summary>
    Task<OrderResponse> ConfirmOrderAsync(
        Guid tenantId, Guid userId, Guid orderId, CancellationToken ct = default);

    /// <summary>
    /// Dispatch a Confirmed order. Transitions status to Dispatched.
    /// </summary>
    Task<OrderResponse> DispatchOrderAsync(
        Guid tenantId, Guid userId, Guid orderId, CancellationToken ct = default);

    /// <summary>
    /// Cancel an order. If it was Confirmed, reverses the stock deduction.
    /// Cannot cancel Dispatched or already Cancelled orders.
    /// </summary>
    Task<OrderResponse> CancelOrderAsync(
        Guid tenantId, Guid userId, Guid orderId, string reason, CancellationToken ct = default);

    /// <summary>
    /// Delete a Draft order permanently.
    /// </summary>
    Task DeleteOrderAsync(Guid tenantId, Guid orderId, CancellationToken ct = default);
}
