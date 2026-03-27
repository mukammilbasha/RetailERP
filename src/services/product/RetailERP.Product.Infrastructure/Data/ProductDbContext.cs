using Microsoft.EntityFrameworkCore;
using RetailERP.Product.Domain.Entities;

namespace RetailERP.Product.Infrastructure.Data;

public class ProductDbContext : DbContext
{
    public ProductDbContext(DbContextOptions<ProductDbContext> options) : base(options) { }

    // Product entities
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<FootwearDetail> FootwearDetails => Set<FootwearDetail>();
    public DbSet<LeatherGoodsDetail> LeatherGoodsDetails => Set<LeatherGoodsDetail>();
    public DbSet<ArticleSize> ArticleSizes => Set<ArticleSize>();

    // Master data entities
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<Gender> Genders => Set<Gender>();
    public DbSet<Season> Seasons => Set<Season>();
    public DbSet<Segment> Segments => Set<Segment>();
    public DbSet<SubSegment> SubSegments => Set<SubSegment>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<SubCategory> SubCategories => Set<SubCategory>();
    public DbSet<Group> Groups => Set<Group>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ── Article (product schema) ─────────────────────────────────────────

        modelBuilder.Entity<Article>(entity =>
        {
            entity.ToTable("Articles", "product");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("ArticleId");
            entity.Property(e => e.ArticleCode).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ArticleName).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Color).HasMaxLength(100);
            entity.Property(e => e.Style).HasMaxLength(100);
            entity.Property(e => e.Fastener).HasMaxLength(100);
            entity.Property(e => e.HSNCode).HasMaxLength(20).IsRequired();
            entity.Property(e => e.UOM).HasMaxLength(10).HasDefaultValue("PCS");
            entity.Property(e => e.MRP).HasColumnType("decimal(18,2)");
            entity.Property(e => e.CBD).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ImageUrl).HasMaxLength(500);

            entity.HasIndex(e => new { e.TenantId, e.ArticleCode }).IsUnique();

            entity.HasOne(e => e.Brand).WithMany(b => b.Articles).HasForeignKey(e => e.BrandId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Segment).WithMany(s => s.Articles).HasForeignKey(e => e.SegmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.SubSegment).WithMany(ss => ss.Articles).HasForeignKey(e => e.SubSegmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Category).WithMany(c => c.Articles).HasForeignKey(e => e.CategoryId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.SubCategory).WithMany(sc => sc.Articles).HasForeignKey(e => e.SubCategoryId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Group).WithMany(g => g.Articles).HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Season).WithMany(s => s.Articles).HasForeignKey(e => e.SeasonId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Gender).WithMany(g => g.Articles).HasForeignKey(e => e.GenderId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.FootwearDetail).WithOne(f => f.Article).HasForeignKey<FootwearDetail>(f => f.ArticleId);
            entity.HasOne(e => e.LeatherGoodsDetail).WithOne(l => l.Article).HasForeignKey<LeatherGoodsDetail>(l => l.ArticleId);
            entity.HasMany(e => e.Sizes).WithOne(s => s.Article).HasForeignKey(s => s.ArticleId);
        });

        // ── Footwear Detail ─────────────────────────────────────────────────

        modelBuilder.Entity<FootwearDetail>(entity =>
        {
            entity.ToTable("FootwearDetails", "product");
            entity.HasKey(e => e.FootwearDetailId);
            entity.Property(e => e.Last).HasMaxLength(100);
            entity.Property(e => e.UpperLeather).HasMaxLength(200);
            entity.Property(e => e.LiningLeather).HasMaxLength(200);
            entity.Property(e => e.Sole).HasMaxLength(200);
        });

        // ── Leather Goods Detail ────────────────────────────────────────────

        modelBuilder.Entity<LeatherGoodsDetail>(entity =>
        {
            entity.ToTable("LeatherGoodsDetails", "product");
            entity.HasKey(e => e.LeatherGoodsDetailId);
            entity.Property(e => e.Dimensions).HasMaxLength(200);
            entity.Property(e => e.Security).HasMaxLength(200);
        });

        // ── Article Size ────────────────────────────────────────────────────

        modelBuilder.Entity<ArticleSize>(entity =>
        {
            entity.ToTable("ArticleSizes", "product");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("ArticleSizeId");
            // ArticleSizes table doesn't have audit columns from BaseAuditableEntity
            entity.Ignore(e => e.TenantId);
            entity.Ignore(e => e.CreatedAt);
            entity.Ignore(e => e.UpdatedAt);
            entity.Ignore(e => e.CreatedBy);
            entity.Property(e => e.UKSize).HasColumnType("decimal(4,1)");
            entity.Property(e => e.USSize).HasColumnType("decimal(4,1)");
            entity.Property(e => e.EANCode).HasMaxLength(20);
            entity.Property(e => e.MRP).HasColumnType("decimal(18,2)");
        });

        // ── Brand (master schema) ───────────────────────────────────────────

        modelBuilder.Entity<Brand>(entity =>
        {
            entity.ToTable("Brands", "master");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("BrandId");
            entity.Property(e => e.Name).HasColumnName("BrandName").HasMaxLength(100).IsRequired();
            entity.HasIndex(e => new { e.TenantId, e.Name }).IsUnique();
        });

        // ── Gender (master schema) ──────────────────────────────────────────

        modelBuilder.Entity<Gender>(entity =>
        {
            entity.ToTable("Genders", "master");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("GenderId");
            entity.Property(e => e.Name).HasColumnName("GenderName").HasMaxLength(50).IsRequired();
            entity.HasIndex(e => new { e.TenantId, e.Name }).IsUnique();
        });

        // ── Season (master schema) ──────────────────────────────────────────

        modelBuilder.Entity<Season>(entity =>
        {
            entity.ToTable("Seasons", "master");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("SeasonId");
            entity.Property(e => e.SeasonCode).HasMaxLength(20).IsRequired();
            entity.HasIndex(e => new { e.TenantId, e.SeasonCode }).IsUnique();
        });

        // ── Segment (master schema) ─────────────────────────────────────────

        modelBuilder.Entity<Segment>(entity =>
        {
            entity.ToTable("Segments", "master");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("SegmentId");
            entity.Property(e => e.Name).HasColumnName("SegmentName").HasMaxLength(100).IsRequired();
            entity.HasIndex(e => new { e.TenantId, e.Name }).IsUnique();
        });

        // ── SubSegment (master schema) ──────────────────────────────────────

        modelBuilder.Entity<SubSegment>(entity =>
        {
            entity.ToTable("SubSegments", "master");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("SubSegmentId");
            entity.Property(e => e.Name).HasColumnName("SubSegmentName").HasMaxLength(100).IsRequired();
            entity.HasOne(e => e.Segment).WithMany(s => s.SubSegments).HasForeignKey(e => e.SegmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.TenantId, e.SegmentId, e.Name }).IsUnique();
        });

        // ── Category (master schema) ────────────────────────────────────────

        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("Categories", "master");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("CategoryId");
            entity.Property(e => e.Name).HasColumnName("CategoryName").HasMaxLength(100).IsRequired();
            entity.HasIndex(e => new { e.TenantId, e.Name }).IsUnique();
        });

        // ── SubCategory (master schema) ─────────────────────────────────────

        modelBuilder.Entity<SubCategory>(entity =>
        {
            entity.ToTable("SubCategories", "master");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("SubCategoryId");
            entity.Property(e => e.Name).HasColumnName("SubCategoryName").HasMaxLength(100).IsRequired();
            entity.HasOne(e => e.Category).WithMany(c => c.SubCategories).HasForeignKey(e => e.CategoryId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.TenantId, e.CategoryId, e.Name }).IsUnique();
        });

        // ── Group (master schema) ───────────────────────────────────────────

        modelBuilder.Entity<Group>(entity =>
        {
            entity.ToTable("Groups", "master");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("GroupId");
            entity.Property(e => e.Name).HasColumnName("GroupName").HasMaxLength(100).IsRequired();
            entity.HasIndex(e => new { e.TenantId, e.Name }).IsUnique();
        });
    }
}
