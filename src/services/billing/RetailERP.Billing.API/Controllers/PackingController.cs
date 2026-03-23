using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailERP.Billing.Application.Interfaces;
using RetailERP.Billing.Application.Services;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Billing.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PackingController : ControllerBase
{
    private readonly IBillingService _billingService;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public PackingController(IBillingService billingService)
    {
        _billingService = billingService;
    }

    /// <summary>
    /// Create a packing list linked to an invoice.
    /// Each line can include size breakdown and carton/box information.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<PackingListDto>>> Create(
        [FromBody] CreatePackingListRequest request, CancellationToken ct)
    {
        var result = await _billingService.CreatePackingListAsync(TenantId, UserId, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.PackingListId },
            ApiResponse<PackingListDto>.Ok(result));
    }

    /// <summary>
    /// List packing lists with filters (invoiceId, status, dateFrom, dateTo) and pagination.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<PackingListSummaryDto>>>> GetAll(
        [FromQuery] PackingQueryParams query, CancellationToken ct)
    {
        var result = await _billingService.GetPackingListsPagedAsync(TenantId, query, ct);
        return Ok(ApiResponse<PagedResult<PackingListSummaryDto>>.Ok(result));
    }

    /// <summary>
    /// Get a single packing list with carton details, line items and delivery notes.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<PackingListDto>>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _billingService.GetPackingListAsync(TenantId, id, ct);
        return Ok(ApiResponse<PackingListDto>.Ok(result));
    }

    /// <summary>
    /// Update packing list status: Draft → Packed → Dispatched.
    /// Body: { "status": "Packed" }
    /// </summary>
    [HttpPut("{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<PackingListDto>>> UpdateStatus(
        Guid id, [FromBody] UpdatePackingStatusRequest request, CancellationToken ct)
    {
        var result = await _billingService.UpdatePackingStatusAsync(TenantId, id, request.Status, ct);
        return Ok(ApiResponse<PackingListDto>.Ok(result, $"Packing list status updated to {request.Status}"));
    }

    /// <summary>
    /// Soft-delete a packing list (marks IsActive=false).
    /// Cannot delete Dispatched packing lists.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken ct)
    {
        await _billingService.DeletePackingListAsync(TenantId, id, ct);
        return Ok(ApiResponse<object>.Ok(null, "Packing list deleted"));
    }
}
