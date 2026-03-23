using Microsoft.EntityFrameworkCore;
using RetailERP.Inventory.Domain.Entities;

namespace RetailERP.Inventory.Infrastructure.Data;

public class InventoryDbContext : DbContext
{
    public InventoryDbContext(DbContextOptions<InventoryDbContext> options) : base(options) { }

    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<StockLedger> StockLedgers => Set<StockLedger>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<StockAdjustment> StockAdjustments => Set<StockAdjustment>();
    public DbSet<StockAdjustmentLine> StockAdjustmentLines => Set<StockAdjustmentLine>();
    public DbSet<GoodsReceivedNote> GoodsReceivedNotes => Set<GoodsReceivedNote>();
    public DbSet<GRNLine> GRNLines => Set<GRNLine>();
    public DbSet<StockFreeze> StockFreezes => Set<StockFreeze>();
    public DbSet<StockFreezeLine> StockFreezeLines => Set<StockFreezeLine>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Warehouse>(entity =>
        {
            entity.ToTable("Warehouses", "warehouse");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("WarehouseId");
            entity.HasIndex(e => new { e.TenantId, e.WarehouseCode }).IsUnique();
        });

        modelBuilder.Entity<StockLedger>(entity =>
        {
            entity.ToTable("StockLedger", "inventory");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("StockLedgerId");
            entity.Ignore(e => e.SKU);
            entity.Ignore(e => e.Size);
            entity.Ignore(e => e.Color);
            entity.Ignore(e => e.QuantityOnHand);
            entity.Ignore(e => e.QuantityReserved);
            entity.Ignore(e => e.ReorderLevel);
            entity.Ignore(e => e.ReorderQuantity);
            entity.HasOne(e => e.Warehouse).WithMany(w => w.StockLedgers).HasForeignKey(e => e.WarehouseId);
            entity.HasIndex(e => new { e.TenantId, e.ArticleId, e.WarehouseId }).IsUnique();
        });

        modelBuilder.Entity<StockMovement>(entity =>
        {
            entity.ToTable("StockMovements", "inventory");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("MovementId");
            entity.Ignore(e => e.SKU);
            entity.Ignore(e => e.Size);
            entity.Ignore(e => e.Color);
            entity.Ignore(e => e.ReferenceNumber);
            entity.HasOne(e => e.Warehouse).WithMany(w => w.StockMovements).HasForeignKey(e => e.WarehouseId);
            entity.HasIndex(e => new { e.TenantId, e.MovementDate });
        });

        modelBuilder.Entity<StockAdjustment>(entity =>
        {
            entity.ToTable("StockAdjustments", "inventory");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("AdjustmentId");
            entity.HasOne(e => e.Warehouse).WithMany().HasForeignKey(e => e.WarehouseId);
            entity.HasIndex(e => new { e.TenantId, e.AdjustmentNumber }).IsUnique();
        });

        modelBuilder.Entity<StockAdjustmentLine>(entity =>
        {
            entity.ToTable("StockAdjustmentLines", "inventory");
            entity.HasKey(e => e.AdjustmentLineId);
            entity.HasOne(e => e.Adjustment).WithMany(a => a.Lines).HasForeignKey(e => e.AdjustmentId);
        });

        modelBuilder.Entity<GoodsReceivedNote>(entity =>
        {
            entity.ToTable("GoodsReceivedNotes", "inventory");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("GRNId");
            entity.HasOne(e => e.Warehouse).WithMany().HasForeignKey(e => e.WarehouseId);
            entity.HasIndex(e => new { e.TenantId, e.GRNNumber }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.WarehouseId, e.Status });
        });

        modelBuilder.Entity<GRNLine>(entity =>
        {
            entity.ToTable("GRNLines", "inventory");
            entity.HasKey(e => e.GRNLineId);
            entity.HasOne(e => e.GoodsReceivedNote).WithMany(g => g.Lines).HasForeignKey(e => e.GRNId);
        });

        modelBuilder.Entity<StockFreeze>(entity =>
        {
            entity.ToTable("StockFreezes", "inventory");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("FreezeId");
            entity.HasOne(e => e.Warehouse).WithMany().HasForeignKey(e => e.WarehouseId);
            entity.HasIndex(e => new { e.TenantId, e.WarehouseId, e.FreezeMonth, e.FreezeYear }).IsUnique();
        });

        modelBuilder.Entity<StockFreezeLine>(entity =>
        {
            entity.ToTable("StockFreezeLines", "inventory");
            entity.HasKey(e => e.FreezeLineId);
            entity.HasOne(e => e.StockFreeze).WithMany(f => f.Lines).HasForeignKey(e => e.FreezeId);
            entity.Property(e => e.OpeningValue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ReceivedValue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.IssuedValue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ReturnValue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.HandloanInValue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.HandloanOutValue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.JobworkInValue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.JobworkOutValue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ClosingValue).HasColumnType("decimal(18,2)");
        });
    }
}
