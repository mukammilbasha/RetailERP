using Microsoft.EntityFrameworkCore;
using RetailERP.Auth.Domain.Entities;

namespace RetailERP.Auth.Infrastructure.Data.Context;

public class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<TenantSettings> TenantSettings => Set<TenantSettings>();
    public DbSet<License> Licenses => Set<License>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.ToTable("Tenants", "auth");
            entity.HasKey(e => e.TenantId);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users", "auth");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("UserId");
            entity.HasOne(e => e.Role).WithMany(r => r.Users).HasForeignKey(e => e.RoleId);
            entity.HasMany(e => e.RefreshTokens).WithOne(t => t.User).HasForeignKey(t => t.UserId);
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("Roles", "auth");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("RoleId");
            entity.Ignore(e => e.UpdatedAt);
            entity.Ignore(e => e.CreatedBy);
        });

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.ToTable("Permissions", "auth");
            entity.HasKey(e => e.PermissionId);
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.ToTable("RolePermissions", "auth");
            entity.HasKey(e => e.RolePermissionId);
            entity.HasOne(e => e.Role).WithMany(r => r.RolePermissions).HasForeignKey(e => e.RoleId);
            entity.HasOne(e => e.Permission).WithMany(p => p.RolePermissions).HasForeignKey(e => e.PermissionId);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("RefreshTokens", "auth");
            entity.HasKey(e => e.TokenId);
        });

        modelBuilder.Entity<TenantSettings>(entity =>
        {
            entity.ToTable("TenantSettings", "auth");
            entity.HasKey(e => e.SettingsId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId);
            entity.Property(e => e.GSTRateFootwearLow).HasColumnType("decimal(5,2)");
            entity.Property(e => e.GSTRateFootwearHigh).HasColumnType("decimal(5,2)");
            entity.Property(e => e.GSTRateOther).HasColumnType("decimal(5,2)");
        });

        modelBuilder.Entity<License>(entity =>
        {
            entity.ToTable("Licenses", "auth");
            entity.HasKey(e => e.LicenseId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId);
            entity.HasIndex(e => e.LicenseKey).IsUnique();
            entity.Ignore(e => e.IsExpired);
            entity.Ignore(e => e.IsActive);
        });
    }
}
