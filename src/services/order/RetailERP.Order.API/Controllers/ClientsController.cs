using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailERP.Order.Application.Services;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Order.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClientsController : ControllerBase
{
    private readonly IClientService _clientService;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public ClientsController(IClientService clientService)
    {
        _clientService = clientService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<ClientDto>>>> GetAll(
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var allClients = await _clientService.GetAllClientsAsync(TenantId, searchTerm, ct);
        var totalCount = allClients.Count;
        var items = allClients
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var paged = new PagedResult<ClientDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
        return Ok(ApiResponse<PagedResult<ClientDto>>.Ok(paged));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ClientDto>>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _clientService.GetClientByIdAsync(TenantId, id, ct);
        return Ok(ApiResponse<ClientDto>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ClientDto>>> Create(
        [FromBody] CreateClientRequest request, CancellationToken ct)
    {
        var result = await _clientService.CreateClientAsync(TenantId, UserId, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.ClientId }, ApiResponse<ClientDto>.Ok(result));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ClientDto>>> Update(
        Guid id, [FromBody] CreateClientRequest request, CancellationToken ct)
    {
        var result = await _clientService.UpdateClientAsync(TenantId, id, request, ct);
        return Ok(ApiResponse<ClientDto>.Ok(result));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        await _clientService.DeleteClientAsync(TenantId, id, ct);
        return Ok(ApiResponse<bool>.Ok(true, "Client deleted"));
    }

    [HttpGet("{clientId:guid}/stores")]
    public async Task<ActionResult<ApiResponse<List<StoreDto>>>> GetStores(Guid clientId, CancellationToken ct)
    {
        var result = await _clientService.GetStoresByClientAsync(TenantId, clientId, ct);
        return Ok(ApiResponse<List<StoreDto>>.Ok(result));
    }
}
