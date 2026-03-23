using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailERP.Order.Application.Services;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Order.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StoresController : ControllerBase
{
    private readonly IClientService _clientService;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public StoresController(IClientService clientService)
    {
        _clientService = clientService;
    }

    /// <summary>
    /// List stores, optionally filtered by clientId, with pagination and search.
    /// GET /api/stores
    /// GET /api/stores?clientId={clientId}&amp;searchTerm=abc&amp;pageNumber=1&amp;pageSize=25
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<StoreDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResult<StoreDto>>>> GetAll(
        [FromQuery] Guid? clientId,
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        List<StoreDto> allStores;

        if (clientId.HasValue)
        {
            allStores = await _clientService.GetStoresByClientAsync(TenantId, clientId.Value, ct);
        }
        else
        {
            allStores = await _clientService.GetAllStoresAsync(TenantId, ct);
        }

        // Apply search filter
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim();
            allStores = allStores.Where(s =>
                s.StoreName.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                s.StoreCode.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                (s.City != null && s.City.Contains(term, StringComparison.OrdinalIgnoreCase))
            ).ToList();
        }

        var totalCount = allStores.Count;
        var items = allStores
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var paged = new PagedResult<StoreDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
        return Ok(ApiResponse<PagedResult<StoreDto>>.Ok(paged));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<StoreDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<StoreDto>>> GetById(Guid id, CancellationToken ct)
    {
        var store = await _clientService.GetStoreByIdAsync(TenantId, id, ct);
        return Ok(ApiResponse<StoreDto>.Ok(store));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<StoreDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<StoreDto>>> Create(
        [FromBody] CreateStoreWithClientRequest request, CancellationToken ct)
    {
        var storeRequest = new CreateStoreRequest
        {
            StoreCode = request.StoreCode,
            StoreName = request.StoreName,
            Format = request.Format,
            Organisation = request.Organisation,
            City = request.City,
            State = request.State,
            Channel = request.Channel,
            ModusOperandi = request.ModusOperandi,
            MarginPercent = request.MarginPercent,
            MarginType = request.MarginType,
            ManagerName = request.ManagerName,
            Email = request.Email,
            GSTIN = request.GSTIN,
            PAN = request.PAN
        };
        var result = await _clientService.CreateStoreAsync(TenantId, UserId, request.ClientId, storeRequest, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.StoreId }, ApiResponse<StoreDto>.Ok(result));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<StoreDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<StoreDto>>> Update(
        Guid id, [FromBody] CreateStoreRequest request, CancellationToken ct)
    {
        var result = await _clientService.UpdateStoreAsync(TenantId, id, request, ct);
        return Ok(ApiResponse<StoreDto>.Ok(result));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        await _clientService.DeleteStoreAsync(TenantId, id, ct);
        return Ok(ApiResponse<bool>.Ok(true, "Store deleted"));
    }
}

public class CreateStoreWithClientRequest : CreateStoreRequest
{
    public Guid ClientId { get; set; }
}
