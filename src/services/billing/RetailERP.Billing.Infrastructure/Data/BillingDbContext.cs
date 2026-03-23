using Microsoft.EntityFrameworkCore;
using RetailERP.Billing.Domain.Entities;

namespace RetailERP.Billing.Infrastructure.Data;

public class BillingDbContext : DbContext
{
    public BillingDbContext(DbContextOptions<BillingDbContext> options) : base(options) { }

    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLine> InvoiceLines => Set<InvoiceLine>();
    public DbSet<PackingList> PackingLists => Set<PackingList>();
    public DbSet<PackingListLine> PackingListLines => Set<PackingListLine>();
    public DbSet<DeliveryNote> DeliveryNotes => Set<DeliveryNote>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("Invoices", "billing");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("InvoiceId");
            entity.HasIndex(e => new { e.TenantId, e.InvoiceNumber }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.ClientId, e.InvoiceDate });
            entity.HasIndex(e => new { e.TenantId, e.StoreId, e.InvoiceDate });
            entity.HasIndex(e => new { e.TenantId, e.Status });

            entity.Property(e => e.InvoiceNumber).HasColumnName("InvoiceNo").HasMaxLength(50).IsRequired();
            entity.Property(e => e.ClientName).HasColumnName("BillToName").HasMaxLength(250).IsRequired();
            entity.Property(e => e.ClientGSTIN).HasColumnName("BillToGSTIN").HasMaxLength(20);
            entity.Property(e => e.ClientAddress).HasMaxLength(1000);
            entity.Property(e => e.StoreName).HasMaxLength(250);
            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
            entity.Property(e => e.SalesType).HasMaxLength(20).HasDefaultValue("Local");
            entity.Property(e => e.PONumber).HasMaxLength(100);
            entity.Property(e => e.Logistic).HasMaxLength(250);
            entity.Property(e => e.TransportMode).HasMaxLength(100);
            entity.Property(e => e.VehicleNo).HasMaxLength(50);
            entity.Property(e => e.PlaceOfSupply).HasMaxLength(100);
            entity.Property(e => e.SellerState).HasMaxLength(100);
            entity.Property(e => e.BuyerState).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.Property(e => e.OrderNumber).HasMaxLength(100);

            entity.Property(e => e.CompanyName).HasMaxLength(500);
            entity.Property(e => e.CompanyAddress).HasMaxLength(1000);
            entity.Property(e => e.CompanyGSTIN).HasMaxLength(20);
            entity.Property(e => e.CompanyPAN).HasMaxLength(20);
            entity.Property(e => e.BankName).HasMaxLength(250);
            entity.Property(e => e.BankAccountNo).HasMaxLength(50);
            entity.Property(e => e.BankIFSC).HasMaxLength(20);
            entity.Property(e => e.BankBranch).HasMaxLength(250);

            entity.Property(e => e.SubTotal).HasColumnType("decimal(18,2)");
            entity.Property(e => e.DiscountAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TaxableAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.CGSTTotal).HasColumnType("decimal(18,2)");
            entity.Property(e => e.SGSTTotal).HasColumnType("decimal(18,2)");
            entity.Property(e => e.IGSTTotal).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalTax).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.PaidAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalMarginAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalGSTPayableValue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalBillingExclGST).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalGSTReimbursementValue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalBillingInclGST).HasColumnType("decimal(18,2)");

            entity.Ignore(e => e.BalanceAmount);
        });

        modelBuilder.Entity<InvoiceLine>(entity =>
        {
            entity.ToTable("InvoiceLines", "billing");
            entity.HasKey(e => e.InvoiceLineId);
            entity.HasOne(e => e.Invoice).WithMany(i => i.Lines).HasForeignKey(e => e.InvoiceId);
            entity.HasIndex(e => e.InvoiceId);

            entity.Property(e => e.SKU).HasMaxLength(100);
            entity.Property(e => e.ArticleName).HasMaxLength(500);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Size).HasMaxLength(50);
            entity.Property(e => e.Color).HasMaxLength(100);
            entity.Property(e => e.HSNCode).HasMaxLength(20);
            entity.Property(e => e.UOM).HasMaxLength(20);
            entity.Property(e => e.SizeBreakdownJson).HasMaxLength(2000);

            entity.Property(e => e.MRP).HasColumnType("decimal(18,2)");
            entity.Property(e => e.MarginPercent).HasColumnType("decimal(5,2)");
            entity.Property(e => e.MarginAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.GSTPayablePercent).HasColumnType("decimal(5,2)");
            entity.Property(e => e.GSTPayableValue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18,2)");
            entity.Property(e => e.GSTReimbursementPercent).HasColumnType("decimal(5,2)");
            entity.Property(e => e.GSTReimbursementValue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalBilling).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TaxableAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.GSTRate).HasColumnType("decimal(5,2)");
            entity.Property(e => e.CGSTRate).HasColumnType("decimal(5,2)");
            entity.Property(e => e.CGSTAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.SGSTRate).HasColumnType("decimal(5,2)");
            entity.Property(e => e.SGSTAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.IGSTRate).HasColumnType("decimal(5,2)");
            entity.Property(e => e.IGSTAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.LineTotal).HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<PackingList>(entity =>
        {
            entity.ToTable("PackingLists", "billing");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("PackingListId");
            entity.HasOne(e => e.Invoice).WithMany(i => i.PackingLists).HasForeignKey(e => e.InvoiceId);
            entity.HasIndex(e => new { e.TenantId, e.PackingNumber }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.InvoiceId });

            entity.Property(e => e.PackingNumber).HasColumnName("PackingNo").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
            entity.Property(e => e.TotalBoxes).HasColumnName("TotalCartons");
            entity.Property(e => e.TotalWeight).HasColumnType("decimal(10,2)");
            entity.Property(e => e.Notes).HasMaxLength(2000);
        });

        modelBuilder.Entity<PackingListLine>(entity =>
        {
            entity.ToTable("PackingListLines", "billing");
            entity.HasKey(e => e.PackingListLineId);
            entity.Property(e => e.PackingListLineId).HasColumnName("PackingLineId");
            entity.HasOne(e => e.PackingList).WithMany(p => p.Lines).HasForeignKey(e => e.PackingListId);
            entity.HasIndex(e => e.PackingListId);

            entity.Property(e => e.SKU).HasMaxLength(100);
            entity.Property(e => e.ArticleName).HasMaxLength(500);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Size).HasColumnName("EuroSize").HasMaxLength(50);
            entity.Property(e => e.Color).HasMaxLength(100);
            entity.Property(e => e.HSNCode).HasMaxLength(20);
            entity.Property(e => e.BoxNumber).HasColumnName("CartonNumber");
            entity.Property(e => e.SizeBreakdownJson).HasMaxLength(2000);
            entity.Property(e => e.Weight).HasColumnType("decimal(10,2)");
        });

        modelBuilder.Entity<DeliveryNote>(entity =>
        {
            entity.ToTable("DeliveryNotes", "billing");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("DeliveryNoteId");
            entity.HasOne(e => e.PackingList).WithMany(p => p.DeliveryNotes).HasForeignKey(e => e.PackingListId);
            entity.HasIndex(e => new { e.TenantId, e.DeliveryNumber }).IsUnique();

            entity.Property(e => e.DeliveryNumber).HasColumnName("DeliveryNoteNo").HasMaxLength(50).IsRequired();
            entity.Property(e => e.TransporterName).HasMaxLength(250);
            entity.Property(e => e.VehicleNumber).HasMaxLength(50);
            entity.Property(e => e.LRNumber).HasMaxLength(100);
            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(2000);
        });
    }
}
