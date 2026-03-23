namespace RetailERP.Shared.Contracts.Order;

// ====================================================================
// Request DTOs
// ====================================================================

public record CreateSizeWiseOrderRequest
{
    public Guid ClientId { get; init; }
    public Guid StoreId { get; init; }
    public Guid WarehouseId { get; init; }
    public DateTime OrderDate { get; init; }
    public string? Channel { get; init; }
    public string? Notes { get; init; }
    public List<OrderArticleRequest> Articles { get; init; } = new();
}

public record OrderArticleRequest
{
    public Guid ArticleId { get; init; }
    public string Color { get; init; } = "";
    public string HSNCode { get; init; } = "";
    public decimal MRP { get; init; }
    public List<SizeQuantity> Sizes { get; init; } = new();
}

public record SizeQuantity
{
    public int EuroSize { get; init; }
    public int Quantity { get; init; }
    public bool StockAvailable { get; init; }
}

public record UpdateOrderStatusRequest
{
    public string Action { get; init; } = "";   // "confirm", "cancel", "dispatch"
    public string? Reason { get; init; }        // Required for cancel
}

// ====================================================================
// Response DTOs
// ====================================================================

public record OrderResponse
{
    public Guid OrderId { get; init; }
    public string OrderNo { get; init; } = "";
    public DateTime OrderDate { get; init; }
    public Guid ClientId { get; init; }
    public string ClientName { get; init; } = "";
    public Guid StoreId { get; init; }
    public string StoreName { get; init; } = "";
    public Guid WarehouseId { get; init; }
    public int TotalQuantity { get; init; }
    public decimal TotalMRP { get; init; }
    public decimal TotalAmount { get; init; }
    public string Status { get; init; } = "";
    public string? Channel { get; init; }
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
    public List<OrderLineResponse> Lines { get; init; } = new();
}

public record OrderLineResponse
{
    public Guid OrderLineId { get; init; }
    public Guid ArticleId { get; init; }
    public string Color { get; init; } = "";
    public string HSNCode { get; init; } = "";
    public decimal MRP { get; init; }
    public int Quantity { get; init; }
    public int DispatchedQty { get; init; }
    public decimal LineTotal { get; init; }
    public bool StockAvailable { get; init; }
    public List<SizeRunResponse> SizeRuns { get; init; } = new();
}

public record SizeRunResponse
{
    public Guid OrderSizeRunId { get; init; }
    public int EuroSize { get; init; }
    public int Quantity { get; init; }
    public bool StockAvailable { get; init; }
}

public record OrderListResponse
{
    public Guid OrderId { get; init; }
    public string OrderNo { get; init; } = "";
    public DateTime OrderDate { get; init; }
    public string ClientName { get; init; } = "";
    public string StoreName { get; init; } = "";
    public int TotalQuantity { get; init; }
    public decimal TotalAmount { get; init; }
    public string Status { get; init; } = "";
    public int TotalLines { get; init; }
    public int TotalSizes { get; init; }
}

// ====================================================================
// Stock Position DTOs (used by Order service for stock check)
// ====================================================================

public record StockPositionResponse
{
    public Guid ArticleId { get; init; }
    public Guid WarehouseId { get; init; }
    public List<SizeStockPosition> Sizes { get; init; } = new();
}

public record SizeStockPosition
{
    public int EuroSize { get; init; }
    public int WarehouseStock { get; init; }       // ClosingStock from StockLedger
    public int CustomerAllocated { get; init; }     // Already allocated in other Draft/Confirmed orders
    public int Available { get; init; }             // WarehouseStock - CustomerAllocated
}

// ====================================================================
// Query Parameters
// ====================================================================

public class OrderQueryParams
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
    public string? Search { get; set; }
    public string? Status { get; set; }
    public Guid? ClientId { get; set; }
    public Guid? StoreId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}
