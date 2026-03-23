namespace RetailERP.Auth.Domain.Entities;

public class License
{
    public Guid LicenseId { get; set; }
    public Guid TenantId { get; set; }
    public string LicenseKey { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public string Status { get; set; } = "Inactive"; // Active, Inactive, Expired, Revoked
    public int MaxUsers { get; set; }
    public DateTime ValidFrom { get; set; }
    public DateTime ValidUntil { get; set; }
    public string? ModulesEnabled { get; set; } // JSON or CSV of enabled module names
    public Guid? ActivatedBy { get; set; }
    public DateTime? ActivatedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Tenant Tenant { get; set; } = null!;

    // Computed
    public bool IsExpired => DateTime.UtcNow >= ValidUntil;
    public bool IsActive => Status == "Active" && !IsExpired;
}
