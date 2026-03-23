using RetailERP.Shared.Contracts.Auth;

namespace RetailERP.Auth.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<LoginResponse> RefreshTokenAsync(string refreshToken, CancellationToken ct = default);
    Task RevokeTokenAsync(string refreshToken, CancellationToken ct = default);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default);
}

public interface IUserService
{
    Task<UserInfo> GetByIdAsync(Guid userId, Guid tenantId, CancellationToken ct = default);
    Task<List<UserInfo>> GetAllAsync(Guid tenantId, CancellationToken ct = default);
    Task<UserInfo> CreateAsync(Guid tenantId, CreateUserRequest request, Guid createdBy, CancellationToken ct = default);
    Task<UserInfo> UpdateAsync(Guid userId, Guid tenantId, UpdateUserRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, Guid tenantId, CancellationToken ct = default);
}

public interface IJwtTokenService
{
    string GenerateAccessToken(Guid userId, Guid tenantId, string email, string role, string tenantName);
    string GenerateRefreshToken();
}
