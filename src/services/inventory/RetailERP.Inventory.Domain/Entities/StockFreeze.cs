using RetailERP.Shared.Domain.Entities;

namespace RetailERP.Inventory.Domain.Entities;

public class StockFreeze : BaseEntity
{
    public Guid WarehouseId { get; set; }
    public int FreezeMonth { get; set; }
    public int FreezeYear { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Frozen
    public DateTime? FrozenAt { get; set; }
    public Guid? FrozenBy { get; set; }

    public Warehouse Warehouse { get; set; } = null!;
    public ICollection<StockFreezeLine> Lines { get; set; } = new List<StockFreezeLine>();
}

public class StockFreezeLine
{
    public Guid FreezeLineId { get; set; }
    public Guid FreezeId { get; set; }
    public Guid ArticleId { get; set; }
    public string? EuroSize { get; set; }

    // Opening
    public int OpeningQty { get; set; }
    public decimal OpeningValue { get; set; }

    // Received
    public int ReceivedQty { get; set; }
    public decimal ReceivedValue { get; set; }

    // Issued
    public int IssuedQty { get; set; }
    public decimal IssuedValue { get; set; }

    // Return
    public int ReturnQty { get; set; }
    public decimal ReturnValue { get; set; }

    // Handloan In
    public int HandloanInQty { get; set; }
    public decimal HandloanInValue { get; set; }

    // Handloan Out
    public int HandloanOutQty { get; set; }
    public decimal HandloanOutValue { get; set; }

    // Jobwork In
    public int JobworkInQty { get; set; }
    public decimal JobworkInValue { get; set; }

    // Jobwork Out
    public int JobworkOutQty { get; set; }
    public decimal JobworkOutValue { get; set; }

    // Closing
    public int ClosingQty { get; set; }
    public decimal ClosingValue { get; set; }

    public StockFreeze StockFreeze { get; set; } = null!;
}
