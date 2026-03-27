using Microsoft.EntityFrameworkCore;
using RetailERP.Order.Domain.Entities;

namespace RetailERP.Order.Infrastructure.Data;

public class OrderDbContext : DbContext
{
    public OrderDbContext(DbContextOptions<OrderDbContext> options) : base(options) { }

    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Store> Stores => Set<Store>();
    public DbSet<CustomerMasterEntry> CustomerMasterEntries => Set<CustomerMasterEntry>();
    public DbSet<CustomerOrder> Orders => Set<CustomerOrder>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();
    public DbSet<OrderSizeRun> OrderSizeRuns => Set<OrderSizeRun>();
    public DbSet<StockLedgerView> StockLedger => Set<StockLedgerView>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // -- Client --
        modelBuilder.Entity<Client>(entity =>
        {
            entity.ToTable("Clients", "sales");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("ClientId");
            entity.HasIndex(e => new { e.TenantId, e.ClientCode }).IsUnique();
            entity.Property(e => e.MarginPercent).HasColumnType("decimal(18,2)");
        });

        // -- Store --
        modelBuilder.Entity<Store>(entity =>
        {
            entity.ToTable("Stores", "sales");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("StoreId");
            entity.HasOne(e => e.Client).WithMany(c => c.Stores).HasForeignKey(e => e.ClientId);
            entity.HasIndex(e => new { e.TenantId, e.StoreCode }).IsUnique();
            entity.Property(e => e.MarginPercent).HasColumnType("decimal(18,2)");
        });

        // -- CustomerMasterEntry -> sales.CustomerMasterEntries --
        modelBuilder.Entity<CustomerMasterEntry>(entity =>
        {
            entity.ToTable("CustomerMasterEntries", "sales");
            entity.HasKey(e => e.CustomerEntryId);
            entity.Property(e => e.MarginPercent).HasColumnType("decimal(5,2)");
            entity.HasOne(e => e.Store).WithMany().HasForeignKey(e => e.StoreId);
            entity.HasOne(e => e.Client).WithMany().HasForeignKey(e => e.ClientId);
        });

        // -- CustomerOrder -> sales.CustomerOrders --
        modelBuilder.Entity<CustomerOrder>(entity =>
        {
            entity.ToTable("CustomerOrders", "sales");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("OrderId");

            entity.Property(e => e.OrderNo).HasMaxLength(50).IsRequired();
            entity.HasIndex(e => new { e.TenantId, e.OrderNo }).IsUnique();

            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Channel).HasMaxLength(50);
            entity.Property(e => e.TotalMRP).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.CancellationReason).HasMaxLength(500);

            entity.HasOne(e => e.Client).WithMany(c => c.Orders).HasForeignKey(e => e.ClientId);
            entity.HasOne(e => e.Store).WithMany(s => s.Orders).HasForeignKey(e => e.StoreId);
        });

        // -- OrderLine -> sales.OrderLines --
        modelBuilder.Entity<OrderLine>(entity =>
        {
            entity.ToTable("OrderLines", "sales");
            entity.HasKey(e => e.OrderLineId);

            entity.Property(e => e.Color).HasMaxLength(100);
            entity.Property(e => e.HSNCode).HasMaxLength(20);
            entity.Property(e => e.MRP).HasColumnType("decimal(18,2)");
            entity.Property(e => e.LineTotal).HasColumnType("decimal(18,2)");

            entity.HasOne(e => e.Order)
                  .WithMany(o => o.Lines)
                  .HasForeignKey(e => e.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // -- OrderSizeRun -> sales.OrderSizeRuns --
        modelBuilder.Entity<OrderSizeRun>(entity =>
        {
            entity.ToTable("OrderSizeRuns", "sales");
            entity.HasKey(e => e.OrderSizeRunId);

            entity.HasOne(e => e.OrderLine)
                  .WithMany(l => l.SizeRuns)
                  .HasForeignKey(e => e.OrderLineId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // -- StockLedgerView -> inventory.StockLedger (read-only) --
        modelBuilder.Entity<StockLedgerView>(entity =>
        {
            entity.ToTable("StockLedger", "inventory");
            entity.HasKey(e => e.StockLedgerId);

            entity.Property(e => e.ClosingStock)
                  .HasComputedColumnSql("[OpeningStock] + [InwardQty] - [OutwardQty]", stored: false);
        });
    }
}
