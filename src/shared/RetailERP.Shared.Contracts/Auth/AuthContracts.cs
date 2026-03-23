namespace RetailERP.Shared.Contracts.Auth;

public record LoginRequest(string Email, string Password);

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserInfo User
);

public record UserInfo(
    Guid UserId,
    Guid TenantId,
    string FullName,
    string Email,
    string Role,
    string TenantName
);

public record RefreshTokenRequest(string RefreshToken);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record CreateUserRequest(
    string FullName,
    string Email,
    Guid RoleId,
    string TemporaryPassword
);

public record UpdateUserRequest(
    string FullName,
    string Email,
    Guid RoleId,
    bool IsActive
);
