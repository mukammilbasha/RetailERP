-- ============================================================
-- RetailERP - Authentication & Authorization Tables
-- ============================================================
USE RetailERP;
GO

-- Tenants (Multi-tenant support)
CREATE TABLE auth.Tenants (
    TenantId        UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantName      NVARCHAR(200)       NOT NULL,
    TenantCode      NVARCHAR(50)        NOT NULL,
    CompanyName     NVARCHAR(300)       NOT NULL,
    GSTIN           NVARCHAR(15)        NULL,
    PAN             NVARCHAR(10)        NULL,
    Address         NVARCHAR(500)       NULL,
    City            NVARCHAR(100)       NULL,
    State           NVARCHAR(100)       NULL,
    PinCode         NVARCHAR(10)        NULL,
    Phone           NVARCHAR(20)        NULL,
    Email           NVARCHAR(200)       NULL,
    LogoUrl         NVARCHAR(500)       NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CONSTRAINT PK_Tenants PRIMARY KEY (TenantId),
    CONSTRAINT UQ_Tenants_Code UNIQUE (TenantCode)
);
GO

-- Roles
CREATE TABLE auth.Roles (
    RoleId          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    RoleName        NVARCHAR(100)       NOT NULL,
    Description     NVARCHAR(500)       NULL,
    IsSystem        BIT                 NOT NULL DEFAULT 0,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Roles PRIMARY KEY (RoleId),
    CONSTRAINT FK_Roles_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_Roles_Name_Tenant UNIQUE (TenantId, RoleName)
);
GO

-- Permissions
CREATE TABLE auth.Permissions (
    PermissionId    UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    Module          NVARCHAR(100)       NOT NULL,
    CanView         BIT                 NOT NULL DEFAULT 0,
    CanAdd          BIT                 NOT NULL DEFAULT 0,
    CanEdit         BIT                 NOT NULL DEFAULT 0,
    CanDelete       BIT                 NOT NULL DEFAULT 0,
    CONSTRAINT PK_Permissions PRIMARY KEY (PermissionId),
    CONSTRAINT UQ_Permissions_Module UNIQUE (Module)
);
GO

-- Role-Permission mapping
CREATE TABLE auth.RolePermissions (
    RolePermissionId UNIQUEIDENTIFIER   NOT NULL DEFAULT NEWSEQUENTIALID(),
    RoleId          UNIQUEIDENTIFIER    NOT NULL,
    PermissionId    UNIQUEIDENTIFIER    NOT NULL,
    CanView         BIT                 NOT NULL DEFAULT 0,
    CanAdd          BIT                 NOT NULL DEFAULT 0,
    CanEdit         BIT                 NOT NULL DEFAULT 0,
    CanDelete       BIT                 NOT NULL DEFAULT 0,
    CONSTRAINT PK_RolePermissions PRIMARY KEY (RolePermissionId),
    CONSTRAINT FK_RolePerm_Role FOREIGN KEY (RoleId) REFERENCES auth.Roles(RoleId),
    CONSTRAINT FK_RolePerm_Perm FOREIGN KEY (PermissionId) REFERENCES auth.Permissions(PermissionId),
    CONSTRAINT UQ_RolePerm UNIQUE (RoleId, PermissionId)
);
GO

-- Users
CREATE TABLE auth.Users (
    UserId          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    FullName        NVARCHAR(200)       NOT NULL,
    Email           NVARCHAR(200)       NOT NULL,
    PasswordHash    NVARCHAR(500)       NOT NULL,
    RoleId          UNIQUEIDENTIFIER    NOT NULL,
    AvatarUrl       NVARCHAR(500)       NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    IsFirstLogin    BIT                 NOT NULL DEFAULT 1,
    LastLoginAt     DATETIME2(7)        NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Users PRIMARY KEY (UserId),
    CONSTRAINT FK_Users_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Users_Role FOREIGN KEY (RoleId) REFERENCES auth.Roles(RoleId),
    CONSTRAINT UQ_Users_Email_Tenant UNIQUE (TenantId, Email)
);
GO

-- Refresh Tokens
CREATE TABLE auth.RefreshTokens (
    TokenId         UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    UserId          UNIQUEIDENTIFIER    NOT NULL,
    Token           NVARCHAR(500)       NOT NULL,
    ExpiresAt       DATETIME2(7)        NOT NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    RevokedAt       DATETIME2(7)        NULL,
    ReplacedByToken NVARCHAR(500)       NULL,
    CONSTRAINT PK_RefreshTokens PRIMARY KEY (TokenId),
    CONSTRAINT FK_RefreshTokens_User FOREIGN KEY (UserId) REFERENCES auth.Users(UserId)
);
GO

-- Audit Log
CREATE TABLE audit.AuditLog (
    AuditId         BIGINT IDENTITY(1,1) NOT NULL,
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    UserId          UNIQUEIDENTIFIER    NULL,
    Action          NVARCHAR(50)        NOT NULL,
    EntityType      NVARCHAR(100)       NOT NULL,
    EntityId        NVARCHAR(100)       NULL,
    OldValues       NVARCHAR(MAX)       NULL,
    NewValues       NVARCHAR(MAX)       NULL,
    IpAddress       NVARCHAR(50)        NULL,
    UserAgent       NVARCHAR(500)       NULL,
    Timestamp       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_AuditLog PRIMARY KEY CLUSTERED (AuditId)
);
GO

PRINT 'Auth tables created successfully.';
GO
