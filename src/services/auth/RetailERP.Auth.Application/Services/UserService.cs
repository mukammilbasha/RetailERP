using Microsoft.EntityFrameworkCore;
using RetailERP.Auth.Application.Interfaces;
using RetailERP.Auth.Domain.Entities;
using RetailERP.Shared.Contracts.Auth;

namespace RetailERP.Auth.Application.Services;

public class UserService : IUserService
{
    private readonly DbContext _context;

    public UserService(DbContext context)
    {
        _context = context;
    }

    public async Task<UserInfo> GetByIdAsync(Guid userId, Guid tenantId, CancellationToken ct = default)
    {
        var user = await _context.Set<User>()
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && u.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"User with ID {userId} not found");

        var tenant = await _context.Set<Tenant>()
            .FirstOrDefaultAsync(t => t.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Tenant not found");

        return new UserInfo(user.Id, user.TenantId, user.FullName, user.Email, user.Role.RoleName, tenant.TenantName);
    }

    public async Task<List<UserInfo>> GetAllAsync(Guid tenantId, CancellationToken ct = default)
    {
        var tenant = await _context.Set<Tenant>()
            .FirstOrDefaultAsync(t => t.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Tenant not found");

        var users = await _context.Set<User>()
            .Include(u => u.Role)
            .Where(u => u.TenantId == tenantId && u.IsActive)
            .OrderBy(u => u.FullName)
            .ToListAsync(ct);

        return users.Select(u => new UserInfo(
            u.Id, u.TenantId, u.FullName, u.Email, u.Role.RoleName, tenant.TenantName
        )).ToList();
    }

    public async Task<UserInfo> CreateAsync(Guid tenantId, CreateUserRequest request, Guid createdBy, CancellationToken ct = default)
    {
        // Validate unique email within tenant
        var exists = await _context.Set<User>()
            .AnyAsync(u => u.TenantId == tenantId && u.Email == request.Email, ct);
        if (exists)
            throw new ArgumentException($"A user with email '{request.Email}' already exists");

        // Validate role exists
        var role = await _context.Set<Role>()
            .FirstOrDefaultAsync(r => r.Id == request.RoleId, ct)
            ?? throw new KeyNotFoundException($"Role with ID {request.RoleId} not found");

        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.TemporaryPassword),
            RoleId = request.RoleId,
            IsFirstLogin = true,
            IsActive = true,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };

        _context.Set<User>().Add(user);
        await _context.SaveChangesAsync(ct);

        var tenant = await _context.Set<Tenant>()
            .FirstOrDefaultAsync(t => t.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Tenant not found");

        return new UserInfo(user.Id, user.TenantId, user.FullName, user.Email, role.RoleName, tenant.TenantName);
    }

    public async Task<UserInfo> UpdateAsync(Guid userId, Guid tenantId, UpdateUserRequest request, CancellationToken ct = default)
    {
        var user = await _context.Set<User>()
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && u.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"User with ID {userId} not found");

        // Check email uniqueness if changed
        if (user.Email != request.Email)
        {
            var emailExists = await _context.Set<User>()
                .AnyAsync(u => u.TenantId == tenantId && u.Email == request.Email && u.Id != userId, ct);
            if (emailExists)
                throw new ArgumentException($"A user with email '{request.Email}' already exists");
        }

        user.FullName = request.FullName;
        user.Email = request.Email;
        user.RoleId = request.RoleId;
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        // Reload role if changed
        if (user.RoleId != request.RoleId)
        {
            await _context.Entry(user).Reference(u => u.Role).LoadAsync(ct);
        }

        var tenant = await _context.Set<Tenant>()
            .FirstOrDefaultAsync(t => t.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Tenant not found");

        return new UserInfo(user.Id, user.TenantId, user.FullName, user.Email, user.Role.RoleName, tenant.TenantName);
    }

    public async Task DeleteAsync(Guid userId, Guid tenantId, CancellationToken ct = default)
    {
        var user = await _context.Set<User>()
            .FirstOrDefaultAsync(u => u.Id == userId && u.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"User with ID {userId} not found");

        // Soft delete
        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }
}
