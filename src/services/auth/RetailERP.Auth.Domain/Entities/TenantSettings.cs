namespace RetailERP.Auth.Domain.Entities;

public class TenantSettings
{
    public Guid SettingsId { get; set; }
    public Guid TenantId { get; set; }

    // Branding
    public string? CompanyLogo { get; set; }
    public string? CompanyName { get; set; }
    public string? TradeName { get; set; }
    public string? Subtitle { get; set; }

    // Tax/Registration
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
    public string? CIN { get; set; }

    // Address
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? AddressLine3 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Pincode { get; set; }
    public string? Country { get; set; }

    // Contact
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }

    // Bank Details
    public string? BankAccountName { get; set; }
    public string? BankName { get; set; }
    public string? BankBranch { get; set; }
    public string? BankAccountNo { get; set; }
    public string? BankIFSCode { get; set; }

    // GST Settings
    public string? GSTRegType { get; set; }
    public decimal? GSTRateFootwearLow { get; set; }
    public decimal? GSTRateFootwearHigh { get; set; }
    public decimal? GSTRateOther { get; set; }

    // Invoice Settings
    public string? HSNPrefix { get; set; }
    public string? InvoicePrefix { get; set; }
    public string? InvoiceFormat { get; set; }
    public int? FYStartMonth { get; set; }

    // Legal/Documents
    public string? TermsAndConditions { get; set; }
    public string? Declaration { get; set; }
    public string? AuthorisedSignatory { get; set; }

    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Tenant Tenant { get; set; } = null!;
}
