using RetailERP.Shared.Domain.Entities;

namespace RetailERP.Billing.Domain.Entities;

public class Invoice : BaseAuditableEntity
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public Guid ClientId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string? ClientGSTIN { get; set; }
    public string? ClientAddress { get; set; }
    public Guid? StoreId { get; set; }
    public string? StoreName { get; set; }
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public string Status { get; set; } = "Draft"; // Draft, Issued, Paid, PartiallyPaid, Cancelled
    public string SalesType { get; set; } = "Local"; // Local, Export
    public string? PONumber { get; set; }
    public DateTime? PODate { get; set; }
    public int CartonBoxes { get; set; }
    public string? Logistic { get; set; }
    public string? TransportMode { get; set; }
    public string? VehicleNo { get; set; }
    public string? PlaceOfSupply { get; set; }
    public bool IsInterState { get; set; }
    public string? SellerState { get; set; }
    public string? BuyerState { get; set; }

    // Summary totals
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal CGSTTotal { get; set; }
    public decimal SGSTTotal { get; set; }
    public decimal IGSTTotal { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount => TotalAmount - PaidAmount;

    // EL CURIO aggregate fields
    public decimal TotalMarginAmount { get; set; }
    public decimal TotalGSTPayableValue { get; set; }
    public decimal TotalBillingExclGST { get; set; }
    public decimal TotalGSTReimbursementValue { get; set; }
    public decimal TotalBillingInclGST { get; set; }
    public int TotalQuantity { get; set; }

    // Company / bank info stored for print snapshots
    public string? CompanyName { get; set; }
    public string? CompanyAddress { get; set; }
    public string? CompanyGSTIN { get; set; }
    public string? CompanyPAN { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountNo { get; set; }
    public string? BankIFSC { get; set; }
    public string? BankBranch { get; set; }

    public string? Notes { get; set; }

    public ICollection<InvoiceLine> Lines { get; set; } = new List<InvoiceLine>();
    public ICollection<PackingList> PackingLists { get; set; } = new List<PackingList>();
}

public class InvoiceLine
{
    public Guid InvoiceLineId { get; set; }
    public Guid InvoiceId { get; set; }
    public int LineNumber { get; set; }
    public Guid ArticleId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? ArticleName { get; set; }
    public string? Description { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string? HSNCode { get; set; }
    public string? UOM { get; set; }

    // Size breakdown stored as JSON: {"39":10,"40":20,"41":15,...}
    public string? SizeBreakdownJson { get; set; }

    public int Quantity { get; set; }
    public decimal MRP { get; set; }

    // Margin
    public decimal MarginPercent { get; set; }
    public decimal MarginAmount { get; set; }

    // GST Payable (on MRP)
    public decimal GSTPayablePercent { get; set; }
    public decimal GSTPayableValue { get; set; }

    // Billing Exclusive GST = MRP - MarginAmount - GSTPayableValue
    public decimal UnitPrice { get; set; }

    // GST Reimbursement (on Billing Exclusive)
    public decimal GSTReimbursementPercent { get; set; }
    public decimal GSTReimbursementValue { get; set; }

    // Billing Inclusive GST = Billing Exclusive + GST Reimbursement
    public decimal TotalBilling { get; set; }

    // Taxable amount = UnitPrice * Quantity (billing exclusive * qty)
    public decimal TaxableAmount { get; set; }

    // Standard GST split for tax return reporting
    public decimal GSTRate { get; set; }
    public decimal CGSTRate { get; set; }
    public decimal CGSTAmount { get; set; }
    public decimal SGSTRate { get; set; }
    public decimal SGSTAmount { get; set; }
    public decimal IGSTRate { get; set; }
    public decimal IGSTAmount { get; set; }

    // LineTotal = TotalBilling * Quantity
    public decimal LineTotal { get; set; }

    public Invoice Invoice { get; set; } = null!;
}

public class PackingList : BaseAuditableEntity
{
    public string PackingNumber { get; set; } = string.Empty;
    public Guid InvoiceId { get; set; }
    public Guid? WarehouseId { get; set; }
    public string Status { get; set; } = "Draft"; // Draft, Packed, Dispatched
    public int TotalBoxes { get; set; }
    public decimal TotalWeight { get; set; }
    public string? Notes { get; set; }
    public DateTime PackingDate { get; set; } = DateTime.UtcNow;

    public Invoice Invoice { get; set; } = null!;
    public ICollection<PackingListLine> Lines { get; set; } = new List<PackingListLine>();
    public ICollection<DeliveryNote> DeliveryNotes { get; set; } = new List<DeliveryNote>();
}

public class PackingListLine
{
    public Guid PackingListLineId { get; set; }
    public Guid PackingListId { get; set; }
    public Guid ArticleId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? ArticleName { get; set; }
    public string? Description { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string? HSNCode { get; set; }
    public int Quantity { get; set; }
    public int BoxNumber { get; set; }
    public decimal Weight { get; set; }

    // Size breakdown stored as JSON: {"39":10,"40":20,...}
    public string? SizeBreakdownJson { get; set; }

    public PackingList PackingList { get; set; } = null!;
}

public class DeliveryNote : BaseAuditableEntity
{
    public string DeliveryNumber { get; set; } = string.Empty;
    public Guid PackingListId { get; set; }
    public string? TransporterName { get; set; }
    public string? VehicleNumber { get; set; }
    public string? LRNumber { get; set; }
    public DateTime? DispatchDate { get; set; }
    public DateTime? DeliveryDate { get; set; }
    public string Status { get; set; } = "Created"; // Created, InTransit, Delivered
    public string? Notes { get; set; }

    public PackingList PackingList { get; set; } = null!;
}
