using RetailERP.Shared.Domain.Entities;

namespace RetailERP.Production.Domain.Entities;

public class ProductionOrder : BaseAuditableEntity
{
    public string ProductionNumber { get; set; } = string.Empty;
    public Guid ArticleId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? ArticleName { get; set; }
    public Guid? SalesOrderId { get; set; }
    public string? SalesOrderNumber { get; set; }
    public Guid? WarehouseId { get; set; }
    public string Status { get; set; } = "Draft"; // Draft, Approved, InProgress, Completed, Cancelled
    public DateTime PlannedStartDate { get; set; }
    public DateTime PlannedEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime? ActualEndDate { get; set; }
    public int TotalQuantity { get; set; }
    public int CompletedQuantity { get; set; }
    public int RejectedQuantity { get; set; }
    public string? Notes { get; set; }
    public string? Season { get; set; }
    public decimal EstimatedCost { get; set; }
    public decimal? ActualCost { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? CompletedBy { get; set; }
    public DateTime? CompletedAt { get; set; }

    public ICollection<ProductionSizeRun> SizeRuns { get; set; } = new List<ProductionSizeRun>();
}

public class ProductionSizeRun
{
    public Guid SizeRunId { get; set; }
    public Guid ProductionOrderId { get; set; }
    public string Size { get; set; } = string.Empty;
    public string? Color { get; set; }
    public int PlannedQuantity { get; set; }
    public int CompletedQuantity { get; set; }
    public int RejectedQuantity { get; set; }
    public int PendingQuantity => PlannedQuantity - CompletedQuantity - RejectedQuantity;

    public ProductionOrder ProductionOrder { get; set; } = null!;
}

/// <summary>
/// Maps to inventory.StockLedger table for stock updates on production completion.
/// ClosingStock is a computed column: OpeningStock + InwardQty - OutwardQty.
/// </summary>
public class ProductionStockLedger
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
