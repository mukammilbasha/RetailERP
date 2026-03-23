using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailERP.Auth.Application.Interfaces;
using RetailERP.Shared.Contracts.Auth;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Auth.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<UserInfo>>>> GetAll(
        [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var allUsers = await _userService.GetAllAsync(TenantId, ct);

        // Apply search filter
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim();
            allUsers = allUsers.Where(u =>
                u.FullName.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                u.Email.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                u.Role.Contains(term, StringComparison.OrdinalIgnoreCase)
            ).ToList();
        }

        var totalCount = allUsers.Count;
        var items = allUsers
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var paged = new PagedResult<UserInfo>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
        return Ok(ApiResponse<PagedResult<UserInfo>>.Ok(paged));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<UserInfo>>> GetById(Guid id, CancellationToken ct)
    {
        var user = await _userService.GetByIdAsync(id, TenantId, ct);
        return Ok(ApiResponse<UserInfo>.Ok(user));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<UserInfo>>> Create(
        [FromBody] CreateUserRequest request, CancellationToken ct)
    {
        var user = await _userService.CreateAsync(TenantId, request, UserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = user.UserId }, ApiResponse<UserInfo>.Ok(user));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<UserInfo>>> Update(
        Guid id, [FromBody] UpdateUserRequest request, CancellationToken ct)
    {
        var user = await _userService.UpdateAsync(id, TenantId, request, ct);
        return Ok(ApiResponse<UserInfo>.Ok(user));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        await _userService.DeleteAsync(id, TenantId, ct);
        return Ok(ApiResponse<bool>.Ok(true, "User deleted"));
    }
}
