namespace RetailERP.Shared.Contracts.Auth;

// --- Tenant Settings ---

public record TenantSettingsResponse(
    Guid SettingsId,
    Guid TenantId,
    string? CompanyLogo,
    string? CompanyName,
    string? TradeName,
    string? Subtitle,
    string? GSTIN,
    string? PAN,
    string? CIN,
    string? AddressLine1,
    string? AddressLine2,
    string? AddressLine3,
    string? City,
    string? State,
    string? Pincode,
    string? Country,
    string? Phone,
    string? Email,
    string? Website,
    string? BankAccountName,
    string? BankName,
    string? BankBranch,
    string? BankAccountNo,
    string? BankIFSCode,
    string? GSTRegType,
    decimal? GSTRateFootwearLow,
    decimal? GSTRateFootwearHigh,
    decimal? GSTRateOther,
    string? HSNPrefix,
    string? InvoicePrefix,
    string? InvoiceFormat,
    int? FYStartMonth,
    string? TermsAndConditions,
    string? Declaration,
    string? AuthorisedSignatory,
    DateTime? UpdatedAt
);

public class UpdateTenantSettingsRequest
{
    public string? CompanyName { get; set; }
    public string? TradeName { get; set; }
    public string? Subtitle { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
    public string? CIN { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? AddressLine3 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Pincode { get; set; }
    public string? Country { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? BankAccountName { get; set; }
    public string? BankName { get; set; }
    public string? BankBranch { get; set; }
    public string? BankAccountNo { get; set; }
    public string? BankIFSCode { get; set; }
    public string? GSTRegType { get; set; }
    public decimal? GSTRateFootwearLow { get; set; }
    public decimal? GSTRateFootwearHigh { get; set; }
    public decimal? GSTRateOther { get; set; }
    public string? HSNPrefix { get; set; }
    public string? InvoicePrefix { get; set; }
    public string? InvoiceFormat { get; set; }
    public int? FYStartMonth { get; set; }
    public string? TermsAndConditions { get; set; }
    public string? Declaration { get; set; }
    public string? AuthorisedSignatory { get; set; }
}

// --- License ---

public record LicenseResponse(
    Guid LicenseId,
    Guid TenantId,
    string LicenseKey,
    string PlanName,
    string Status,
    int MaxUsers,
    DateTime ValidFrom,
    DateTime ValidUntil,
    string? ModulesEnabled,
    Guid? ActivatedBy,
    DateTime? ActivatedAt,
    DateTime CreatedAt,
    bool IsActive
);

public record ActivateLicenseRequest(string LicenseKey);

public record GenerateLicenseRequest(
    string PlanName,
    int DurationDays,
    int MaxUsers,
    string? ModulesEnabled
);

public record GenerateLicenseResponse(string LicenseKey);

// --- Setup Wizard ---

public class TenantSetupRequest
{
    public string? TradeName { get; set; }
    public string? Subtitle { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
    public string? CIN { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? AddressLine3 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Pincode { get; set; }
    public string? Country { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? BankAccountName { get; set; }
    public string? BankName { get; set; }
    public string? BankBranch { get; set; }
    public string? BankAccountNo { get; set; }
    public string? BankIFSCode { get; set; }
    public string? GSTRegType { get; set; }
    public decimal? GSTRateFootwearLow { get; set; }
    public decimal? GSTRateFootwearHigh { get; set; }
    public decimal? GSTRateOther { get; set; }
    public string? HSNPrefix { get; set; }
    public string? InvoicePrefix { get; set; }
    public string? InvoiceFormat { get; set; }
    public int? FYStartMonth { get; set; }
    public string? TermsAndConditions { get; set; }
    public string? Declaration { get; set; }
    public string? AuthorisedSignatory { get; set; }

    // License fields for initial activation
    public string? LicenseKey { get; set; }
}

public record TenantSetupResponse(
    TenantSettingsResponse Settings,
    LicenseResponse? License
);
