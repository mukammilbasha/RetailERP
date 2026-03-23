using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailERP.Auth.Application.Interfaces;
using RetailERP.Shared.Contracts.Auth;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Auth.API.Controllers;

[ApiController]
[Route("api/auth/[controller]")]
[Authorize]
public class TenantController : ControllerBase
{
    private readonly ITenantService _tenantService;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public TenantController(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    // GET /api/auth/tenant/settings
    [HttpGet("settings")]
    public async Task<ActionResult<ApiResponse<TenantSettingsResponse>>> GetSettings(CancellationToken ct)
    {
        var settings = await _tenantService.GetSettingsAsync(TenantId, ct);

        if (settings is null)
            return Ok(ApiResponse<TenantSettingsResponse>.Fail("Tenant settings not found"));

        return Ok(ApiResponse<TenantSettingsResponse>.Ok(settings));
    }

    // PUT /api/auth/tenant/settings
    [HttpPut("settings")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<TenantSettingsResponse>>> UpdateSettings(
        [FromForm] UpdateTenantSettingsRequest request,
        IFormFile? logoFile,
        CancellationToken ct)
    {
        var settings = await _tenantService.SaveSettingsAsync(TenantId, request, logoFile, ct);
        return Ok(ApiResponse<TenantSettingsResponse>.Ok(settings, "Settings updated successfully"));
    }

    // GET /api/auth/tenant/license
    [HttpGet("license")]
    public async Task<ActionResult<ApiResponse<LicenseResponse>>> GetCurrentLicense(CancellationToken ct)
    {
        var license = await _tenantService.GetCurrentLicenseAsync(TenantId, ct);

        if (license is null)
            return Ok(ApiResponse<LicenseResponse>.Fail("No active license found"));

        return Ok(ApiResponse<LicenseResponse>.Ok(license));
    }

    // GET /api/auth/tenant/license/history
    [HttpGet("license/history")]
    public async Task<ActionResult<ApiResponse<List<LicenseResponse>>>> GetLicenseHistory(CancellationToken ct)
    {
        var licenses = await _tenantService.GetLicenseHistoryAsync(TenantId, ct);
        return Ok(ApiResponse<List<LicenseResponse>>.Ok(licenses));
    }

    // POST /api/auth/tenant/license/activate
    [HttpPost("license/activate")]
    public async Task<ActionResult<ApiResponse<LicenseResponse>>> ActivateLicense(
        [FromBody] ActivateLicenseRequest request, CancellationToken ct)
    {
        var license = await _tenantService.ActivateLicenseAsync(TenantId, request.LicenseKey, UserId, ct);
        return Ok(ApiResponse<LicenseResponse>.Ok(license, "License activated successfully"));
    }

    // POST /api/auth/tenant/license/generate
    [HttpPost("license/generate")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<GenerateLicenseResponse>>> GenerateLicense(
        [FromBody] GenerateLicenseRequest request, CancellationToken ct)
    {
        var result = await _tenantService.GenerateLicenseKeyAsync(request, ct);
        return Ok(ApiResponse<GenerateLicenseResponse>.Ok(result, "License key generated"));
    }

    // POST /api/auth/tenant/setup
    [HttpPost("setup")]
    public async Task<ActionResult<ApiResponse<TenantSetupResponse>>> SetupTenant(
        [FromForm] TenantSetupRequest request,
        IFormFile? logoFile,
        CancellationToken ct)
    {
        var result = await _tenantService.SetupTenantAsync(TenantId, request, UserId, logoFile, ct);
        return Ok(ApiResponse<TenantSetupResponse>.Ok(result, "Tenant setup completed"));
    }
}
