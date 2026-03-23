using RetailERP.Shared.Domain.Entities;

namespace RetailERP.Inventory.Domain.Entities;

public class GoodsReceivedNote : BaseEntity
{
    public string GRNNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateTime ReceiptDate { get; set; } = DateTime.UtcNow;
    public string SourceType { get; set; } = string.Empty; // PO, Transfer, Return, Production
    public string? ReferenceNo { get; set; }
    public string Status { get; set; } = "Draft"; // Draft, Confirmed, Cancelled
    public string? Notes { get; set; }
    public int TotalQuantity { get; set; }

    public Warehouse Warehouse { get; set; } = null!;
    public ICollection<GRNLine> Lines { get; set; } = new List<GRNLine>();
}

public class GRNLine
{
    public Guid GRNLineId { get; set; }
    public Guid GRNId { get; set; }
    public Guid ArticleId { get; set; }
    public string? EuroSize { get; set; }
    public int Quantity { get; set; }

    public GoodsReceivedNote GoodsReceivedNote { get; set; } = null!;
}
