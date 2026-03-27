using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailERP.Order.Application.Services;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Order.API.Controllers;

[ApiController]
[Route("api/customer-entries")]
[Authorize]
public class CustomerMasterEntriesController : ControllerBase
{
    private readonly IClientService _clientService;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));

    public CustomerMasterEntriesController(IClientService clientService)
    {
        _clientService = clientService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<CustomerMasterEntryDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResult<CustomerMasterEntryDto>>>> GetAll(
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var all = await _clientService.GetAllCustomerEntriesAsync(TenantId, searchTerm, ct);

        var totalCount = all.Count;
        var items = all
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var paged = new PagedResult<CustomerMasterEntryDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
        return Ok(ApiResponse<PagedResult<CustomerMasterEntryDto>>.Ok(paged));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<CustomerMasterEntryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<CustomerMasterEntryDto>>> GetById(Guid id, CancellationToken ct)
    {
        var entry = await _clientService.GetCustomerEntryByIdAsync(TenantId, id, ct);
        return Ok(ApiResponse<CustomerMasterEntryDto>.Ok(entry));
    }

    [HttpGet("by-store/{storeId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<List<CustomerMasterEntryDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<CustomerMasterEntryDto>>>> GetByStore(Guid storeId, CancellationToken ct)
    {
        var entries = await _clientService.GetCustomerEntriesByStoreAsync(TenantId, storeId, ct);
        return Ok(ApiResponse<List<CustomerMasterEntryDto>>.Ok(entries));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<CustomerMasterEntryDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<CustomerMasterEntryDto>>> Create(
        [FromBody] CreateCustomerMasterEntryRequest request, CancellationToken ct)
    {
        var result = await _clientService.CreateCustomerEntryAsync(TenantId, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.CustomerEntryId },
            ApiResponse<CustomerMasterEntryDto>.Ok(result));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<CustomerMasterEntryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<CustomerMasterEntryDto>>> Update(
        Guid id, [FromBody] CreateCustomerMasterEntryRequest request, CancellationToken ct)
    {
        var result = await _clientService.UpdateCustomerEntryAsync(TenantId, id, request, ct);
        return Ok(ApiResponse<CustomerMasterEntryDto>.Ok(result));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        await _clientService.DeleteCustomerEntryAsync(TenantId, id, ct);
        return Ok(ApiResponse<bool>.Ok(true, "Customer master entry deleted"));
    }
}
