using Microsoft.EntityFrameworkCore;
using RetailERP.Auth.Application.Interfaces;
using RetailERP.Auth.Domain.Entities;
using RetailERP.Shared.Contracts.Auth;

namespace RetailERP.Auth.Application.Services;

public class AuthService : IAuthService
{
    private readonly DbContext _context;
    private readonly IJwtTokenService _jwtService;

    public AuthService(DbContext context, IJwtTokenService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await _context.Set<User>()
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive, ct)
            ?? throw new UnauthorizedAccessException("Invalid email or password");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password");

        var tenant = await _context.Set<Tenant>()
            .FirstOrDefaultAsync(t => t.TenantId == user.TenantId, ct)
            ?? throw new UnauthorizedAccessException("Tenant not found");

        var accessToken = _jwtService.GenerateAccessToken(
            user.Id, user.TenantId, user.Email, user.Role.RoleName, tenant.TenantName);

        var refreshToken = _jwtService.GenerateRefreshToken();
        var refreshTokenEntity = new RefreshToken
        {
            TokenId = Guid.NewGuid(),
            UserId = user.Id,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };

        _context.Set<RefreshToken>().Add(refreshTokenEntity);
        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return new LoginResponse(
            accessToken,
            refreshToken,
            DateTime.UtcNow.AddHours(1),
            new UserInfo(user.Id, user.TenantId, user.FullName, user.Email, user.Role.RoleName, tenant.TenantName)
        );
    }

    public async Task<LoginResponse> RefreshTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        var token = await _context.Set<RefreshToken>()
            .Include(t => t.User).ThenInclude(u => u.Role)
            .FirstOrDefaultAsync(t => t.Token == refreshToken, ct)
            ?? throw new UnauthorizedAccessException("Invalid refresh token");

        if (!token.IsActive)
            throw new UnauthorizedAccessException("Token is expired or revoked");

        var tenant = await _context.Set<Tenant>()
            .FirstOrDefaultAsync(t => t.TenantId == token.User.TenantId, ct)
            ?? throw new UnauthorizedAccessException("Tenant not found");

        // Rotate refresh token
        token.RevokedAt = DateTime.UtcNow;
        var newRefreshToken = _jwtService.GenerateRefreshToken();
        token.ReplacedByToken = newRefreshToken;

        var newTokenEntity = new RefreshToken
        {
            TokenId = Guid.NewGuid(),
            UserId = token.UserId,
            Token = newRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };
        _context.Set<RefreshToken>().Add(newTokenEntity);

        var accessToken = _jwtService.GenerateAccessToken(
            token.User.Id, token.User.TenantId, token.User.Email,
            token.User.Role.RoleName, tenant.TenantName);

        await _context.SaveChangesAsync(ct);

        return new LoginResponse(
            accessToken,
            newRefreshToken,
            DateTime.UtcNow.AddHours(1),
            new UserInfo(token.User.Id, token.User.TenantId, token.User.FullName,
                token.User.Email, token.User.Role.RoleName, tenant.TenantName)
        );
    }

    public async Task RevokeTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        var token = await _context.Set<RefreshToken>()
            .FirstOrDefaultAsync(t => t.Token == refreshToken, ct)
            ?? throw new KeyNotFoundException("Token not found");

        token.RevokedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await _context.Set<User>().FindAsync(new object[] { userId }, ct)
            ?? throw new KeyNotFoundException("User not found");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedAccessException("Current password is incorrect");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.IsFirstLogin = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }
}
