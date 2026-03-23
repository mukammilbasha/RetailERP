using Microsoft.AspNetCore.Http;
using RetailERP.Shared.Contracts.Auth;

namespace RetailERP.Auth.Application.Interfaces;

public interface ITenantService
{
    Task<TenantSettingsResponse?> GetSettingsAsync(Guid tenantId, CancellationToken ct = default);

    Task<TenantSettingsResponse> SaveSettingsAsync(
        Guid tenantId, UpdateTenantSettingsRequest request, IFormFile? logoFile = null, CancellationToken ct = default);

    Task<LicenseResponse?> GetCurrentLicenseAsync(Guid tenantId, CancellationToken ct = default);

    Task<List<LicenseResponse>> GetLicenseHistoryAsync(Guid tenantId, CancellationToken ct = default);

    Task<LicenseResponse> ActivateLicenseAsync(
        Guid tenantId, string licenseKey, Guid userId, CancellationToken ct = default);

    Task<GenerateLicenseResponse> GenerateLicenseKeyAsync(
        GenerateLicenseRequest request, CancellationToken ct = default);

    Task<TenantSetupResponse> SetupTenantAsync(
        Guid tenantId, TenantSetupRequest request, Guid userId, IFormFile? logoFile = null, CancellationToken ct = default);
}
