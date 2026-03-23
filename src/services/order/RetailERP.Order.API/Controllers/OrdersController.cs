using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailERP.Order.Application.Interfaces;
using RetailERP.Shared.Contracts.Common;
using RetailERP.Shared.Contracts.Order;

namespace RetailERP.Order.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(IOrderService orderService, ILogger<OrdersController> logger)
    {
        _orderService = orderService;
        _logger = logger;
    }

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));

    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("User not found in token"));

    // ================================================================
    // GET /api/orders -- List orders (paginated, filterable)
    // Supports: search, status, clientId, storeId, fromDate, toDate
    // Includes size run summary counts per order.
    // ================================================================
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<OrderListResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] OrderQueryParams query, CancellationToken ct)
    {
        try
        {
            var result = await _orderService.GetOrdersAsync(TenantId, query, ct);
            return Ok(ApiResponse<PagedResult<OrderListResponse>>.Ok(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing orders for tenant {TenantId}", TenantId);
            throw;
        }
    }

    // ================================================================
    // GET /api/orders/{id} -- Get order detail with full size run breakdown
    // Returns OrderResponse with Lines -> SizeRuns
    // ================================================================
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<OrderResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await _orderService.GetOrderByIdAsync(TenantId, id, ct);
            return Ok(ApiResponse<OrderResponse>.Ok(result));
        }
        catch (KeyNotFoundException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving order {OrderId}", id);
            throw;
        }
    }

    // ================================================================
    // GET /api/orders/stock/{warehouseId}/{articleId}
    //   Get per-size stock position (warehouse stock, allocated, available)
    //   Used by the order entry screen to show real-time availability.
    // ================================================================
    [HttpGet("stock/{warehouseId:guid}/{articleId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<StockPositionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetArticleStock(
        Guid warehouseId, Guid articleId, CancellationToken ct)
    {
        try
        {
            var result = await _orderService.GetArticleStockAsync(TenantId, warehouseId, articleId, ct);
            return Ok(ApiResponse<StockPositionResponse>.Ok(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking stock for article {ArticleId} in warehouse {WarehouseId}",
                articleId, warehouseId);
            throw;
        }
    }

    // ================================================================
    // POST /api/orders -- Create a new size-wise customer order
    // Body:
    //   { clientId, storeId, warehouseId, orderDate, channel, notes,
    //     articles: [{ articleId, color, hsnCode, mrp,
    //       sizes: [{ euroSize, quantity, stockAvailable }] }] }
    //
    // Creates: CustomerOrder -> OrderLine (per article) ->
    //          OrderSizeRun (per size within article)
    // ================================================================
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<OrderResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateSizeWiseOrderRequest request, CancellationToken ct)
    {
        try
        {
            if (request.Articles == null || !request.Articles.Any())
                throw new ArgumentException("Order must have at least one article");

            var result = await _orderService.CreateOrderAsync(TenantId, UserId, request, ct);
            return CreatedAtAction(nameof(GetById), new { id = result.OrderId },
                ApiResponse<OrderResponse>.Ok(result, "Order created successfully"));
        }
        catch (ArgumentException)
        {
            throw;
        }
        catch (KeyNotFoundException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating order");
            throw;
        }
    }

    // ================================================================
    // PUT /api/orders/{id} -- Update a draft order
    //   Replaces all existing lines and size runs.
    //   Only allowed for Draft status orders.
    // ================================================================
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<OrderResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        Guid id, [FromBody] CreateSizeWiseOrderRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _orderService.UpdateOrderAsync(TenantId, id, request, ct);
            return Ok(ApiResponse<OrderResponse>.Ok(result, "Order updated successfully"));
        }
        catch (ArgumentException)
        {
            throw;
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
            _logger.LogError(ex, "Error updating order {OrderId}", id);
            throw;
        }
    }

    // ================================================================
    // PUT /api/orders/{id}/status -- Unified status transition endpoint
    //   Accepts action: "confirm", "dispatch", "cancel"
    //   State machine:
    //     Draft -> Confirmed (confirm)
    //     Confirmed -> Dispatched (dispatch)
    //     Draft/Confirmed -> Cancelled (cancel, requires reason)
    // ================================================================
    [HttpPut("{id:guid}/status")]
    [ProducesResponseType(typeof(ApiResponse<OrderResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateStatus(
        Guid id, [FromBody] UpdateOrderStatusRequest request, CancellationToken ct)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Action))
                throw new ArgumentException("Action is required. Supported: confirm, dispatch, cancel");

            var action = request.Action.ToLowerInvariant().Trim();

            OrderResponse result = action switch
            {
                "confirm" => await _orderService.ConfirmOrderAsync(TenantId, UserId, id, ct),
                "dispatch" => await _orderService.DispatchOrderAsync(TenantId, UserId, id, ct),
                "cancel" => await _orderService.CancelOrderAsync(
                    TenantId, UserId, id,
                    request.Reason ?? throw new ArgumentException("Reason is required for cancellation"),
                    ct),
                _ => throw new ArgumentException(
                    $"Invalid action '{request.Action}'. Supported actions: confirm, dispatch, cancel")
            };

            var message = action switch
            {
                "confirm" => "Order confirmed",
                "dispatch" => "Order dispatched",
                "cancel" => "Order cancelled",
                _ => null
            };

            return Ok(ApiResponse<OrderResponse>.Ok(result, message));
        }
        catch (ArgumentException)
        {
            throw;
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
            _logger.LogError(ex, "Error updating status for order {OrderId} with action {Action}",
                id, request.Action);
            throw;
        }
    }

    // ================================================================
    // DELETE /api/orders/{id} -- Delete a draft order permanently
    //   Removes OrderSizeRuns, OrderLines, and the CustomerOrder.
    //   Only allowed for Draft status orders.
    // ================================================================
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            await _orderService.DeleteOrderAsync(TenantId, id, ct);
            return Ok(ApiResponse<bool>.Ok(true, "Order deleted"));
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
            _logger.LogError(ex, "Error deleting order {OrderId}", id);
            throw;
        }
    }

    // ================================================================
    // Legacy individual status endpoints (kept for backward compatibility)
    // Prefer using PUT /api/orders/{id}/status with action parameter.
    // ================================================================

    [HttpPost("{id:guid}/confirm")]
    [ProducesResponseType(typeof(ApiResponse<OrderResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Confirm(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await _orderService.ConfirmOrderAsync(TenantId, UserId, id, ct);
            return Ok(ApiResponse<OrderResponse>.Ok(result, "Order confirmed and stock deducted"));
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
            _logger.LogError(ex, "Error confirming order {OrderId}", id);
            throw;
        }
    }

    [HttpPost("{id:guid}/dispatch")]
    [ProducesResponseType(typeof(ApiResponse<OrderResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Dispatch(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await _orderService.DispatchOrderAsync(TenantId, UserId, id, ct);
            return Ok(ApiResponse<OrderResponse>.Ok(result, "Order dispatched"));
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
            _logger.LogError(ex, "Error dispatching order {OrderId}", id);
            throw;
        }
    }

    [HttpPost("{id:guid}/cancel")]
    [ProducesResponseType(typeof(ApiResponse<OrderResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Cancel(
        Guid id, [FromBody] CancelOrderBody? request, CancellationToken ct)
    {
        try
        {
            var reason = request?.Reason ?? "No reason provided";
            var result = await _orderService.CancelOrderAsync(TenantId, UserId, id, reason, ct);
            return Ok(ApiResponse<OrderResponse>.Ok(result, "Order cancelled"));
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
            _logger.LogError(ex, "Error cancelling order {OrderId}", id);
            throw;
        }
    }
}

// Cancel request body for legacy endpoint
public class CancelOrderBody
{
    public string? Reason { get; set; }
}
