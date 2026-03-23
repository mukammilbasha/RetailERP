using RetailERP.Shared.Domain.Entities;

namespace RetailERP.Inventory.Domain.Entities;

public class Warehouse : BaseAuditableEntity
{
    public string WarehouseCode { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PinCode { get; set; }
    public string WarehouseType { get; set; } = "Main"; // Main, Branch, Factory

    public ICollection<StockLedger> StockLedgers { get; set; } = new List<StockLedger>();
    public ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
}

public class StockLedger : BaseEntity
{
    public Guid ArticleId { get; set; }
    public Guid WarehouseId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? Size { get; set; }
    public string? Color { get; set; }
    public int QuantityOnHand { get; set; }
    public int QuantityReserved { get; set; }
    public int QuantityAvailable => QuantityOnHand - QuantityReserved;
    public int ReorderLevel { get; set; }
    public int ReorderQuantity { get; set; }

    public Warehouse Warehouse { get; set; } = null!;
}

public class StockMovement : BaseEntity
{
    public Guid ArticleId { get; set; }
    public Guid WarehouseId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string MovementType { get; set; } = string.Empty; // IN, OUT, TRANSFER, ADJUSTMENT
    public int Quantity { get; set; }
    public string? ReferenceType { get; set; } // PO, SO, PRODUCTION, ADJUSTMENT
    public Guid? ReferenceId { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public DateTime MovementDate { get; set; } = DateTime.UtcNow;

    public Warehouse Warehouse { get; set; } = null!;
}

public class StockAdjustment : BaseAuditableEntity
{
    public string AdjustmentNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft"; // Draft, Approved, Completed, Cancelled
    public string? Notes { get; set; }
    public DateTime AdjustmentDate { get; set; } = DateTime.UtcNow;
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public Warehouse Warehouse { get; set; } = null!;
    public ICollection<StockAdjustmentLine> Lines { get; set; } = new List<StockAdjustmentLine>();
}

public class StockAdjustmentLine
{
    public Guid AdjustmentLineId { get; set; }
    public Guid AdjustmentId { get; set; }
    public Guid ArticleId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? Size { get; set; }
    public string? Color { get; set; }
    public int SystemQuantity { get; set; }
    public int PhysicalQuantity { get; set; }
    public int Variance => PhysicalQuantity - SystemQuantity;

    public StockAdjustment Adjustment { get; set; } = null!;
}
