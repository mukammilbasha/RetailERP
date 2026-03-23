using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RetailERP.Auth.Domain.Entities;
using RetailERP.Auth.Infrastructure.Data.Context;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Auth.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly AuthDbContext _context;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException());

    public RolesController(AuthDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<object>>>> GetAll(CancellationToken ct)
    {
        var roles = await _context.Roles
            .Where(r => r.TenantId == TenantId && r.IsActive)
            .Select(r => new { r.Id, r.RoleName, r.Description, r.IsSystem })
            .ToListAsync(ct);
        return Ok(ApiResponse<List<object>>.Ok(roles.Cast<object>().ToList()));
    }

    [HttpGet("{id:guid}/permissions")]
    public async Task<ActionResult<ApiResponse<List<object>>>> GetPermissions(Guid id, CancellationToken ct)
    {
        var permissions = await _context.RolePermissions
            .Where(rp => rp.RoleId == id)
            .Include(rp => rp.Permission)
            .Select(rp => new
            {
                rp.Permission.Module,
                rp.CanView,
                rp.CanAdd,
                rp.CanEdit,
                rp.CanDelete
            })
            .ToListAsync(ct);
        return Ok(ApiResponse<List<object>>.Ok(permissions.Cast<object>().ToList()));
    }

    [HttpPut("{id:guid}/permissions")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdatePermissions(
        Guid id, [FromBody] PermissionUpdateRequest request, CancellationToken ct)
    {
        // Remove existing role permissions
        var existing = await _context.RolePermissions.Where(rp => rp.RoleId == id).ToListAsync(ct);
        _context.RolePermissions.RemoveRange(existing);

        // Get all permissions by module name, create if missing
        var allPermissions = await _context.Permissions.ToListAsync(ct);
        var permMap = allPermissions.ToDictionary(p => p.Module, p => p);

        foreach (var update in request.Permissions)
        {
            // Find or create the Permission record for this module
            if (!permMap.TryGetValue(update.Module, out var perm))
            {
                perm = new Permission
                {
                    PermissionId = Guid.NewGuid(),
                    Module = update.Module,
                    CanView = true,
                    CanAdd = true,
                    CanEdit = true,
                    CanDelete = true
                };
                _context.Permissions.Add(perm);
                permMap[update.Module] = perm;
            }

            _context.RolePermissions.Add(new RolePermission
            {
                RolePermissionId = Guid.NewGuid(),
                RoleId = id,
                PermissionId = perm.PermissionId,
                CanView = update.CanView,
                CanAdd = update.CanAdd,
                CanEdit = update.CanEdit,
                CanDelete = update.CanDelete
            });
        }

        await _context.SaveChangesAsync(ct);
        return Ok(ApiResponse<bool>.Ok(true, "Permissions updated"));
    }
}

public class PermissionUpdateRequest
{
    public List<PermissionModuleUpdate> Permissions { get; set; } = new();
}

public record PermissionModuleUpdate(
    string Module, bool CanView, bool CanAdd, bool CanEdit, bool CanDelete);
