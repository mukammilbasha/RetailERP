using Microsoft.EntityFrameworkCore;
using RetailERP.Production.Domain.Entities;

namespace RetailERP.Production.Infrastructure.Data;

public class ProductionDbContext : DbContext
{
    public ProductionDbContext(DbContextOptions<ProductionDbContext> options) : base(options) { }

    public DbSet<ProductionOrder> ProductionOrders => Set<ProductionOrder>();
    public DbSet<ProductionSizeRun> ProductionSizeRuns => Set<ProductionSizeRun>();
    public DbSet<ProductionStockLedger> StockLedger => Set<ProductionStockLedger>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProductionOrder>(entity =>
        {
            entity.ToTable("ProductionOrders", "production");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("ProductionOrderId");
            entity.HasIndex(e => new { e.TenantId, e.ProductionNumber }).IsUnique();
            entity.Property(e => e.EstimatedCost).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ActualCost).HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<ProductionSizeRun>(entity =>
        {
            entity.ToTable("ProductionSizeRuns", "production");
            entity.HasKey(e => e.SizeRunId);
            entity.HasOne(e => e.ProductionOrder).WithMany(p => p.SizeRuns).HasForeignKey(e => e.ProductionOrderId);
        });

        // Maps to inventory.StockLedger for stock updates on production completion
        modelBuilder.Entity<ProductionStockLedger>(entity =>
        {
            entity.ToTable("StockLedger", "inventory");
            entity.HasKey(e => e.StockLedgerId);

            entity.Property(e => e.ClosingStock)
                  .HasComputedColumnSql("[OpeningStock] + [InwardQty] - [OutwardQty]", stored: false);
        });
    }
}
