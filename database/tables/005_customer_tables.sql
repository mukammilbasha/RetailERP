-- ============================================================
-- RetailERP - Customer / Client / Store Tables
-- ============================================================
USE RetailERP;
GO

-- Clients (B2B distribution clients)
CREATE TABLE sales.Clients (
    ClientId        UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    ClientCode      NVARCHAR(50)        NOT NULL,
    ClientName      NVARCHAR(300)       NOT NULL,
    Organisation    NVARCHAR(300)       NULL,
    GSTIN           NVARCHAR(15)        NULL,
    PAN             NVARCHAR(10)        NULL,
    StateId         INT                 NULL,
    StateCode       NVARCHAR(5)         NULL,
    Zone            NVARCHAR(20)        NULL,
    Email           NVARCHAR(200)       NULL,
    ContactNo       NVARCHAR(20)        NULL,
    MarginPercent   DECIMAL(5,2)        NOT NULL DEFAULT 0,
    MarginType      NVARCHAR(20)        NOT NULL DEFAULT 'NET OF TAXES',
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Clients PRIMARY KEY (ClientId),
    CONSTRAINT FK_Clients_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Clients_State FOREIGN KEY (StateId) REFERENCES master.States(StateId),
    CONSTRAINT UQ_Clients_Code_Tenant UNIQUE (TenantId, ClientCode)
);
GO

-- Stores (retail store locations linked to clients)
CREATE TABLE sales.Stores (
    StoreId         UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    ClientId        UNIQUEIDENTIFIER    NOT NULL,
    StoreCode       NVARCHAR(50)        NOT NULL,
    StoreName       NVARCHAR(300)       NOT NULL,
    Format          NVARCHAR(50)        NULL,  -- RETAIL_MALL, RETAIL_HIGH_STREET, OUTLET
    Organisation    NVARCHAR(300)       NULL,
    City            NVARCHAR(100)       NULL,
    State           NVARCHAR(100)       NULL,
    Channel         NVARCHAR(50)        NULL,  -- MBO, EBO, DISTRIBUTOR
    ModusOperandi   NVARCHAR(10)        NULL,  -- SOR, OUT_MKT
    MarginPercent   DECIMAL(5,2)        NOT NULL DEFAULT 0,
    MarginType      NVARCHAR(20)        NOT NULL DEFAULT 'NET OF TAXES',
    ManagerName     NVARCHAR(200)       NULL,
    Email           NVARCHAR(200)       NULL,
    GSTIN           NVARCHAR(15)        NULL,
    PAN             NVARCHAR(10)        NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Stores PRIMARY KEY (StoreId),
    CONSTRAINT FK_Stores_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Stores_Client FOREIGN KEY (ClientId) REFERENCES sales.Clients(ClientId),
    CONSTRAINT UQ_Stores_Code_Tenant UNIQUE (TenantId, StoreCode)
);
GO

-- Customer Master Entry (store-level billing/shipping details)
CREATE TABLE sales.CustomerMasterEntries (
    CustomerEntryId UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    StoreId         UNIQUEIDENTIFIER    NOT NULL,
    ClientId        UNIQUEIDENTIFIER    NOT NULL,
    EntryDate       DATE                NOT NULL,
    StoreCode       NVARCHAR(50)        NULL,
    Organisation    NVARCHAR(300)       NULL,
    -- Billing Address
    BillingAddress1 NVARCHAR(200)       NULL,
    BillingAddress2 NVARCHAR(200)       NULL,
    BillingAddress3 NVARCHAR(200)       NULL,
    BillingAddress4 NVARCHAR(200)       NULL,
    BillingAddress5 NVARCHAR(200)       NULL,
    BillingPinCode  NVARCHAR(10)        NULL,
    BillingCity     NVARCHAR(100)       NULL,
    BillingNumber   NVARCHAR(20)        NULL,
    BillingState    NVARCHAR(100)       NULL,
    BillingStateCode NVARCHAR(5)        NULL,
    BillingZone     NVARCHAR(20)        NULL,
    -- Shipping Address
    SameAsBilling   BIT                 NOT NULL DEFAULT 0,
    ShippingAddress1 NVARCHAR(200)      NULL,
    ShippingAddress2 NVARCHAR(200)      NULL,
    ShippingAddress3 NVARCHAR(200)      NULL,
    ShippingPinCode NVARCHAR(10)        NULL,
    ShippingCity    NVARCHAR(100)       NULL,
    ShippingNumber  NVARCHAR(20)        NULL,
    ShippingState   NVARCHAR(100)       NULL,
    ShippingStateCode NVARCHAR(5)       NULL,
    ShippingZone    NVARCHAR(20)        NULL,
    -- Contact & Tax
    ContactName     NVARCHAR(200)       NULL,
    ContactNo       NVARCHAR(20)        NULL,
    Email           NVARCHAR(200)       NULL,
    StoreManager    NVARCHAR(200)       NULL,
    ManagerContact  NVARCHAR(20)        NULL,
    AreaManager     NVARCHAR(200)       NULL,
    AreaContact     NVARCHAR(20)        NULL,
    BuyerDesign     NVARCHAR(200)       NULL,
    GSTIN           NVARCHAR(15)        NULL,
    GSTStateCode    NVARCHAR(5)         NULL,
    PAN             NVARCHAR(10)        NULL,
    FSSAI           NVARCHAR(20)        NULL,
    -- Business Config
    BusinessChannel NVARCHAR(50)        NULL,  -- MBO, EBO
    BusinessModule  NVARCHAR(50)        NULL,  -- SOR, OUT_MKT
    MarginPercent   DECIMAL(5,2)        NOT NULL DEFAULT 0,
    MarginType      NVARCHAR(20)        NOT NULL DEFAULT 'NET OF TAXES',
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CONSTRAINT PK_CustomerMasterEntries PRIMARY KEY (CustomerEntryId),
    CONSTRAINT FK_CME_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_CME_Store FOREIGN KEY (StoreId) REFERENCES sales.Stores(StoreId),
    CONSTRAINT FK_CME_Client FOREIGN KEY (ClientId) REFERENCES sales.Clients(ClientId)
);
GO
