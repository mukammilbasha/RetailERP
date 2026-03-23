using RetailERP.Shared.Domain.Entities;

namespace RetailERP.Order.Domain.Entities;

public class Client : BaseAuditableEntity
{
    public string ClientCode { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string? Organisation { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
    public Guid? StateId { get; set; }
    public string? StateCode { get; set; }
    public string? Zone { get; set; }
    public string? Email { get; set; }
    public string? ContactNo { get; set; }
    public decimal MarginPercent { get; set; }
    public string? MarginType { get; set; }

    public ICollection<Store> Stores { get; set; } = new List<Store>();
    public ICollection<CustomerOrder> Orders { get; set; } = new List<CustomerOrder>();
}

public class Store : BaseAuditableEntity
{
    public Guid ClientId { get; set; }
    public string StoreCode { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
    public string? Format { get; set; }
    public string? Organisation { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Channel { get; set; }
    public string? ModusOperandi { get; set; }
    public decimal MarginPercent { get; set; }
    public string? MarginType { get; set; }
    public string? ManagerName { get; set; }
    public string? Email { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }

    public Client Client { get; set; } = null!;
    public ICollection<CustomerOrder> Orders { get; set; } = new List<CustomerOrder>();
}

/// <summary>
/// Maps to sales.CustomerOrders table.
/// Uses Id (from BaseEntity) mapped to OrderId column.
/// </summary>
public class CustomerOrder : BaseEntity
{
    public string OrderNo { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public Guid ClientId { get; set; }
    public Guid StoreId { get; set; }
    public Guid WarehouseId { get; set; }
    public int TotalQuantity { get; set; }
    public decimal TotalMRP { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Draft"; // Draft, Confirmed, Dispatched, Cancelled
    public string? Channel { get; set; }
    public string? Notes { get; set; }
    public Guid? ConfirmedBy { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public Guid? CancelledBy { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }

    // Navigation properties
    public Client Client { get; set; } = null!;
    public Store Store { get; set; } = null!;
    public List<OrderLine> Lines { get; set; } = new();
}

/// <summary>
/// Maps to sales.OrderLines table.
/// One line per article (aggregated across sizes).
/// </summary>
public class OrderLine
{
    public Guid OrderLineId { get; set; }
    public Guid OrderId { get; set; }
    public Guid ArticleId { get; set; }
    public string Color { get; set; } = string.Empty;
    public string HSNCode { get; set; } = string.Empty;
    public decimal MRP { get; set; }
    public int Quantity { get; set; }
    public int DispatchedQty { get; set; }
    public decimal LineTotal { get; set; }
    public bool StockAvailable { get; set; }

    // Navigation
    public CustomerOrder Order { get; set; } = null!;
    public List<OrderSizeRun> SizeRuns { get; set; } = new();
}

/// <summary>
/// Maps to sales.OrderSizeRuns table.
/// One record per size within an OrderLine.
/// </summary>
public class OrderSizeRun
{
    public Guid OrderSizeRunId { get; set; }
    public Guid OrderLineId { get; set; }
    public int EuroSize { get; set; }
    public int Quantity { get; set; }
    public bool StockAvailable { get; set; }

    // Navigation
    public OrderLine OrderLine { get; set; } = null!;
}

/// <summary>
/// Read-only view into inventory.StockLedger for stock queries.
/// ClosingStock is a computed column in the database.
/// </summary>
public class StockLedgerView
{
    public Guid StockLedgerId { get; set; }
    public Guid TenantId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid ArticleId { get; set; }
    public int EuroSize { get; set; }
    public int OpeningStock { get; set; }
    public int InwardQty { get; set; }
    public int OutwardQty { get; set; }
    public int ClosingStock { get; set; } // Computed: OpeningStock + InwardQty - OutwardQty
    public DateTime LastUpdated { get; set; }
}
