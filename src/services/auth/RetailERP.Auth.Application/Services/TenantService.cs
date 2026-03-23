using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using RetailERP.Auth.Application.Interfaces;
using RetailERP.Auth.Domain.Entities;
using RetailERP.Shared.Contracts.Auth;

namespace RetailERP.Auth.Application.Services;

public class TenantService : ITenantService
{
    private readonly DbContext _context;

    public TenantService(DbContext context)
    {
        _context = context;
    }

    public async Task<TenantSettingsResponse?> GetSettingsAsync(Guid tenantId, CancellationToken ct = default)
    {
        var settings = await _context.Set<TenantSettings>()
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId, ct);

        return settings is null ? null : MapToSettingsResponse(settings);
    }

    public async Task<TenantSettingsResponse> SaveSettingsAsync(
        Guid tenantId, UpdateTenantSettingsRequest request, IFormFile? logoFile = null, CancellationToken ct = default)
    {
        var settings = await _context.Set<TenantSettings>()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId, ct);

        if (settings is null)
        {
            settings = new TenantSettings
            {
                SettingsId = Guid.NewGuid(),
                TenantId = tenantId
            };
            _context.Set<TenantSettings>().Add(settings);
        }

        ApplySettingsUpdate(settings, request);

        if (logoFile is not null)
        {
            settings.CompanyLogo = await SaveLogoAsync(tenantId, logoFile, ct);
        }

        settings.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return MapToSettingsResponse(settings);
    }

    public async Task<LicenseResponse?> GetCurrentLicenseAsync(Guid tenantId, CancellationToken ct = default)
    {
        var license = await _context.Set<License>()
            .AsNoTracking()
            .Where(l => l.TenantId == tenantId && l.Status == "Active")
            .OrderByDescending(l => l.ActivatedAt)
            .FirstOrDefaultAsync(ct);

        return license is null ? null : MapToLicenseResponse(license);
    }

    public async Task<List<LicenseResponse>> GetLicenseHistoryAsync(Guid tenantId, CancellationToken ct = default)
    {
        var licenses = await _context.Set<License>()
            .AsNoTracking()
            .Where(l => l.TenantId == tenantId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(ct);

        return licenses.Select(MapToLicenseResponse).ToList();
    }

    public async Task<LicenseResponse> ActivateLicenseAsync(
        Guid tenantId, string licenseKey, Guid userId, CancellationToken ct = default)
    {
        var license = await _context.Set<License>()
            .FirstOrDefaultAsync(l => l.LicenseKey == licenseKey, ct)
            ?? throw new KeyNotFoundException("License key not found");

        if (license.TenantId != Guid.Empty && license.TenantId != tenantId)
            throw new InvalidOperationException("License key is assigned to a different tenant");

        if (license.Status == "Active")
            throw new InvalidOperationException("License key is already activated");

        if (license.IsExpired)
            throw new InvalidOperationException("License key has expired");

        // Deactivate any existing active license for this tenant
        var existingActive = await _context.Set<License>()
            .Where(l => l.TenantId == tenantId && l.Status == "Active")
            .ToListAsync(ct);

        foreach (var existing in existingActive)
        {
            existing.Status = "Inactive";
        }

        // Activate the new license
        license.TenantId = tenantId;
        license.Status = "Active";
        license.ActivatedBy = userId;
        license.ActivatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        return MapToLicenseResponse(license);
    }

    public async Task<GenerateLicenseResponse> GenerateLicenseKeyAsync(
        GenerateLicenseRequest request, CancellationToken ct = default)
    {
        var licenseKey = GenerateKey();

        // Ensure uniqueness
        while (await _context.Set<License>().AnyAsync(l => l.LicenseKey == licenseKey, ct))
        {
            licenseKey = GenerateKey();
        }

        var license = new License
        {
            LicenseId = Guid.NewGuid(),
            TenantId = Guid.Empty, // Unassigned until activation
            LicenseKey = licenseKey,
            PlanName = request.PlanName,
            Status = "Inactive",
            MaxUsers = request.MaxUsers,
            ValidFrom = DateTime.UtcNow,
            ValidUntil = DateTime.UtcNow.AddDays(request.DurationDays),
            ModulesEnabled = request.ModulesEnabled,
            CreatedAt = DateTime.UtcNow
        };

        _context.Set<License>().Add(license);
        await _context.SaveChangesAsync(ct);

        return new GenerateLicenseResponse(licenseKey);
    }

    public async Task<TenantSetupResponse> SetupTenantAsync(
        Guid tenantId, TenantSetupRequest request, Guid userId, IFormFile? logoFile = null, CancellationToken ct = default)
    {
        // Check if settings already exist
        var existingSettings = await _context.Set<TenantSettings>()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId, ct);

        if (existingSettings is not null)
            throw new InvalidOperationException("Tenant has already been set up. Use the update endpoint instead.");

        using var transaction = await _context.Database.BeginTransactionAsync(ct);

        try
        {
            // Create settings
            var settingsRequest = new UpdateTenantSettingsRequest
            {
                TradeName = request.TradeName,
                Subtitle = request.Subtitle,
                GSTIN = request.GSTIN,
                PAN = request.PAN,
                CIN = request.CIN,
                AddressLine1 = request.AddressLine1,
                AddressLine2 = request.AddressLine2,
                AddressLine3 = request.AddressLine3,
                City = request.City,
                State = request.State,
                Pincode = request.Pincode,
                Country = request.Country,
                Phone = request.Phone,
                Email = request.Email,
                Website = request.Website,
                BankAccountName = request.BankAccountName,
                BankName = request.BankName,
                BankBranch = request.BankBranch,
                BankAccountNo = request.BankAccountNo,
                BankIFSCode = request.BankIFSCode,
                GSTRegType = request.GSTRegType,
                GSTRateFootwearLow = request.GSTRateFootwearLow,
                GSTRateFootwearHigh = request.GSTRateFootwearHigh,
                GSTRateOther = request.GSTRateOther,
                HSNPrefix = request.HSNPrefix,
                InvoicePrefix = request.InvoicePrefix,
                InvoiceFormat = request.InvoiceFormat,
                FYStartMonth = request.FYStartMonth,
                TermsAndConditions = request.TermsAndConditions,
                Declaration = request.Declaration,
                AuthorisedSignatory = request.AuthorisedSignatory
            };

            var settingsResponse = await SaveSettingsAsync(tenantId, settingsRequest, logoFile, ct);

            // Activate license if key provided
            LicenseResponse? licenseResponse = null;
            if (!string.IsNullOrWhiteSpace(request.LicenseKey))
            {
                licenseResponse = await ActivateLicenseAsync(tenantId, request.LicenseKey, userId, ct);
            }

            await transaction.CommitAsync(ct);

            return new TenantSetupResponse(settingsResponse, licenseResponse);
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            throw;
        }
    }

    // --- Private Helpers ---

    private static string GenerateKey()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();
        return string.Join("-", Enumerable.Range(0, 4).Select(_ =>
            new string(Enumerable.Range(0, 4).Select(_ => chars[random.Next(chars.Length)]).ToArray())));
    }

    private static void ApplySettingsUpdate(TenantSettings settings, UpdateTenantSettingsRequest request)
    {
        settings.CompanyName = request.CompanyName;
        settings.TradeName = request.TradeName;
        settings.Subtitle = request.Subtitle;
        settings.GSTIN = request.GSTIN;
        settings.PAN = request.PAN;
        settings.CIN = request.CIN;
        settings.AddressLine1 = request.AddressLine1;
        settings.AddressLine2 = request.AddressLine2;
        settings.AddressLine3 = request.AddressLine3;
        settings.City = request.City;
        settings.State = request.State;
        settings.Pincode = request.Pincode;
        settings.Country = request.Country;
        settings.Phone = request.Phone;
        settings.Email = request.Email;
        settings.Website = request.Website;
        settings.BankAccountName = request.BankAccountName;
        settings.BankName = request.BankName;
        settings.BankBranch = request.BankBranch;
        settings.BankAccountNo = request.BankAccountNo;
        settings.BankIFSCode = request.BankIFSCode;
        settings.GSTRegType = request.GSTRegType;
        settings.GSTRateFootwearLow = request.GSTRateFootwearLow;
        settings.GSTRateFootwearHigh = request.GSTRateFootwearHigh;
        settings.GSTRateOther = request.GSTRateOther;
        settings.HSNPrefix = request.HSNPrefix;
        settings.InvoicePrefix = request.InvoicePrefix;
        settings.InvoiceFormat = request.InvoiceFormat;
        settings.FYStartMonth = request.FYStartMonth;
        settings.TermsAndConditions = request.TermsAndConditions;
        settings.Declaration = request.Declaration;
        settings.AuthorisedSignatory = request.AuthorisedSignatory;
    }

    private static TenantSettingsResponse MapToSettingsResponse(TenantSettings s)
    {
        return new TenantSettingsResponse(
            s.SettingsId,
            s.TenantId,
            s.CompanyLogo,
            s.CompanyName,
            s.TradeName,
            s.Subtitle,
            s.GSTIN,
            s.PAN,
            s.CIN,
            s.AddressLine1,
            s.AddressLine2,
            s.AddressLine3,
            s.City,
            s.State,
            s.Pincode,
            s.Country,
            s.Phone,
            s.Email,
            s.Website,
            s.BankAccountName,
            s.BankName,
            s.BankBranch,
            s.BankAccountNo,
            s.BankIFSCode,
            s.GSTRegType,
            s.GSTRateFootwearLow,
            s.GSTRateFootwearHigh,
            s.GSTRateOther,
            s.HSNPrefix,
            s.InvoicePrefix,
            s.InvoiceFormat,
            s.FYStartMonth,
            s.TermsAndConditions,
            s.Declaration,
            s.AuthorisedSignatory,
            s.UpdatedAt
        );
    }

    private static LicenseResponse MapToLicenseResponse(License l)
    {
        return new LicenseResponse(
            l.LicenseId,
            l.TenantId,
            l.LicenseKey,
            l.PlanName,
            l.Status,
            l.MaxUsers,
            l.ValidFrom,
            l.ValidUntil,
            l.ModulesEnabled,
            l.ActivatedBy,
            l.ActivatedAt,
            l.CreatedAt,
            l.IsActive
        );
    }

    private static async Task<string> SaveLogoAsync(Guid tenantId, IFormFile logoFile, CancellationToken ct)
    {
        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "logos");
        Directory.CreateDirectory(uploadsDir);

        var extension = Path.GetExtension(logoFile.FileName);
        var allowedExtensions = new[] { ".png", ".jpg", ".jpeg", ".svg", ".webp" };

        if (!allowedExtensions.Contains(extension.ToLowerInvariant()))
            throw new InvalidOperationException("Invalid logo file type. Allowed: png, jpg, jpeg, svg, webp");

        if (logoFile.Length > 2 * 1024 * 1024) // 2MB limit
            throw new InvalidOperationException("Logo file size must be under 2MB");

        var fileName = $"{tenantId}{extension}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await logoFile.CopyToAsync(stream, ct);

        return $"/uploads/logos/{fileName}";
    }
}
