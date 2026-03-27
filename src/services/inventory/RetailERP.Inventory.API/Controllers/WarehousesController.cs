using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RetailERP.Inventory.Domain.Entities;
using RetailERP.Inventory.Infrastructure.Data;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Inventory.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WarehousesController : ControllerBase
{
    private readonly InventoryDbContext _context;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public WarehousesController(InventoryDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<WarehouseDto>>>> GetAll(
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var query = _context.Warehouses
            .Where(w => w.TenantId == TenantId && w.IsActive);

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim();
            query = query.Where(w =>
                w.WarehouseName.Contains(term) ||
                w.WarehouseCode.Contains(term) ||
                (w.City != null && w.City.Contains(term)));
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderBy(w => w.WarehouseName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(w => new WarehouseDto
            {
                WarehouseId = w.Id,
                WarehouseCode = w.WarehouseCode,
                WarehouseName = w.WarehouseName,
                Address = w.Address,
                City = w.City,
                State = w.State,
                PinCode = w.PinCode,
                WarehouseType = w.WarehouseType,
                IsActive = w.IsActive
            })
            .ToListAsync(ct);

        var paged = new PagedResult<WarehouseDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
        return Ok(ApiResponse<PagedResult<WarehouseDto>>.Ok(paged));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<WarehouseDto>>> GetById(Guid id, CancellationToken ct)
    {
        var w = await _context.Warehouses
            .FirstOrDefaultAsync(w => w.Id == id && w.TenantId == TenantId, ct)
            ?? throw new KeyNotFoundException("Warehouse not found");

        return Ok(ApiResponse<WarehouseDto>.Ok(new WarehouseDto
        {
            WarehouseId = w.Id,
            WarehouseCode = w.WarehouseCode,
            WarehouseName = w.WarehouseName,
            Address = w.Address,
            City = w.City,
            State = w.State,
            PinCode = w.PinCode,
            WarehouseType = w.WarehouseType,
            IsActive = w.IsActive
        }));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<WarehouseDto>>> Create(
        [FromBody] CreateWarehouseRequest request, CancellationToken ct)
    {
        var warehouse = new Warehouse
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            WarehouseCode = request.WarehouseCode,
            WarehouseName = request.WarehouseName,
            Address = request.Address,
            City = request.City,
            State = request.State,
            PinCode = request.PinCode,
            WarehouseType = request.WarehouseType ?? "Main",
            CreatedBy = UserId
        };

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync(ct);

        var dto = new WarehouseDto
        {
            WarehouseId = warehouse.Id,
            WarehouseCode = warehouse.WarehouseCode,
            WarehouseName = warehouse.WarehouseName,
            Address = warehouse.Address,
            City = warehouse.City,
            State = warehouse.State,
            PinCode = warehouse.PinCode,
            WarehouseType = warehouse.WarehouseType,
            IsActive = warehouse.IsActive
        };

        return CreatedAtAction(nameof(GetById), new { id = warehouse.Id }, ApiResponse<WarehouseDto>.Ok(dto));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<WarehouseDto>>> Update(
        Guid id, [FromBody] CreateWarehouseRequest request, CancellationToken ct)
    {
        var warehouse = await _context.Warehouses
            .FirstOrDefaultAsync(w => w.Id == id && w.TenantId == TenantId, ct)
            ?? throw new KeyNotFoundException("Warehouse not found");

        warehouse.WarehouseCode = request.WarehouseCode;
        warehouse.WarehouseName = request.WarehouseName;
        warehouse.Address = request.Address;
        warehouse.City = request.City;
        warehouse.State = request.State;
        warehouse.PinCode = request.PinCode;
        warehouse.WarehouseType = request.WarehouseType ?? warehouse.WarehouseType;
        warehouse.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        return Ok(ApiResponse<WarehouseDto>.Ok(new WarehouseDto
        {
            WarehouseId = warehouse.Id,
            WarehouseCode = warehouse.WarehouseCode,
            WarehouseName = warehouse.WarehouseName,
            Address = warehouse.Address,
            City = warehouse.City,
            State = warehouse.State,
            PinCode = warehouse.PinCode,
            WarehouseType = warehouse.WarehouseType,
            IsActive = warehouse.IsActive
        }));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        var warehouse = await _context.Warehouses
            .FirstOrDefaultAsync(w => w.Id == id && w.TenantId == TenantId, ct)
            ?? throw new KeyNotFoundException("Warehouse not found");

        warehouse.IsActive = false;
        warehouse.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return Ok(ApiResponse<bool>.Ok(true, "Warehouse deleted"));
    }
}

public class WarehouseDto
{
    public Guid WarehouseId { get; set; }
    public string WarehouseCode { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PinCode { get; set; }
    public string WarehouseType { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class CreateWarehouseRequest
{
    public string WarehouseCode { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PinCode { get; set; }
    public string? WarehouseType { get; set; }
}
