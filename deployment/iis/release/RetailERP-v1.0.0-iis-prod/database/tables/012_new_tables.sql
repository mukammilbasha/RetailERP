USE RetailERP;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================
-- GRN (Goods Received Notes) Tables
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GoodsReceivedNotes' AND schema_id = SCHEMA_ID('inventory'))
CREATE TABLE inventory.GoodsReceivedNotes (
    GRNId           UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    GRNNumber       NVARCHAR(50)        NOT NULL,
    WarehouseId     UNIQUEIDENTIFIER    NOT NULL,
    ReceiptDate     DATE                NOT NULL DEFAULT GETDATE(),
    SourceType      NVARCHAR(20)        NOT NULL DEFAULT 'Purchase' CHECK (SourceType IN ('Purchase','Production','Return','Transfer')),
    ReferenceNo     NVARCHAR(100)       NULL,
    Status          NVARCHAR(20)        NOT NULL DEFAULT 'Draft' CHECK (Status IN ('Draft','Confirmed','Cancelled')),
    Notes           NVARCHAR(500)       NULL,
    TotalQuantity   INT                 NOT NULL DEFAULT 0,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_GRN PRIMARY KEY (GRNId),
    CONSTRAINT FK_GRN_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_GRN_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT UQ_GRN_Number_Tenant UNIQUE (TenantId, GRNNumber)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GRNLines' AND schema_id = SCHEMA_ID('inventory'))
CREATE TABLE inventory.GRNLines (
    GRNLineId       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    GRNId           UNIQUEIDENTIFIER    NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NULL,
    Quantity        INT                 NOT NULL DEFAULT 0,
    CONSTRAINT PK_GRNLines PRIMARY KEY (GRNLineId),
    CONSTRAINT FK_GRNLines_GRN FOREIGN KEY (GRNId) REFERENCES inventory.GoodsReceivedNotes(GRNId),
    CONSTRAINT FK_GRNLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

-- ============================================
-- Stock Freeze Tables
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StockFreezes' AND schema_id = SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockFreezes (
    FreezeId        UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    WarehouseId     UNIQUEIDENTIFIER    NOT NULL,
    FreezeMonth     INT                 NOT NULL CHECK (FreezeMonth BETWEEN 1 AND 12),
    FreezeYear      INT                 NOT NULL CHECK (FreezeYear BETWEEN 2020 AND 2100),
    Status          NVARCHAR(20)        NOT NULL DEFAULT 'Open' CHECK (Status IN ('Open','Frozen')),
    FrozenAt        DATETIME2(7)        NULL,
    FrozenBy        UNIQUEIDENTIFIER    NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_StockFreeze PRIMARY KEY (FreezeId),
    CONSTRAINT FK_StockFreeze_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_StockFreeze_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT UQ_StockFreeze UNIQUE (TenantId, WarehouseId, FreezeMonth, FreezeYear)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StockFreezeLines' AND schema_id = SCHEMA_ID('inventory'))
CREATE TABLE inventory.StockFreezeLines (
    FreezeLineId    UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    FreezeId        UNIQUEIDENTIFIER    NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NULL,
    OpeningQty      INT                 NOT NULL DEFAULT 0,
    OpeningValue    DECIMAL(18,2)       NOT NULL DEFAULT 0,
    ReceivedQty     INT                 NOT NULL DEFAULT 0,
    ReceivedValue   DECIMAL(18,2)       NOT NULL DEFAULT 0,
    IssuedQty       INT                 NOT NULL DEFAULT 0,
    IssuedValue     DECIMAL(18,2)       NOT NULL DEFAULT 0,
    ReturnQty       INT                 NOT NULL DEFAULT 0,
    ReturnValue     DECIMAL(18,2)       NOT NULL DEFAULT 0,
    HandloanInQty   INT                 NOT NULL DEFAULT 0,
    HandloanInValue DECIMAL(18,2)       NOT NULL DEFAULT 0,
    HandloanOutQty  INT                 NOT NULL DEFAULT 0,
    HandloanOutValue DECIMAL(18,2)      NOT NULL DEFAULT 0,
    JobworkInQty    INT                 NOT NULL DEFAULT 0,
    JobworkInValue  DECIMAL(18,2)       NOT NULL DEFAULT 0,
    JobworkOutQty   INT                 NOT NULL DEFAULT 0,
    JobworkOutValue DECIMAL(18,2)       NOT NULL DEFAULT 0,
    ClosingQty      INT                 NOT NULL DEFAULT 0,
    ClosingValue    DECIMAL(18,2)       NOT NULL DEFAULT 0,
    CONSTRAINT PK_StockFreezeLines PRIMARY KEY (FreezeLineId),
    CONSTRAINT FK_StockFreezeLines_Freeze FOREIGN KEY (FreezeId) REFERENCES inventory.StockFreezes(FreezeId),
    CONSTRAINT FK_StockFreezeLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

-- ============================================
-- Company/Tenant Settings
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TenantSettings' AND schema_id = SCHEMA_ID('auth'))
CREATE TABLE auth.TenantSettings (
    SettingsId      UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    CompanyLogo     NVARCHAR(500)       NULL,
    TradeName       NVARCHAR(200)       NULL,
    Subtitle        NVARCHAR(200)       NULL,
    GSTIN           NVARCHAR(20)        NULL,
    PAN             NVARCHAR(15)        NULL,
    CIN             NVARCHAR(25)        NULL,
    AddressLine1    NVARCHAR(200)       NULL,
    AddressLine2    NVARCHAR(200)       NULL,
    AddressLine3    NVARCHAR(200)       NULL,
    City            NVARCHAR(100)       NULL,
    State           NVARCHAR(100)       NULL,
    Pincode         NVARCHAR(10)        NULL,
    Country         NVARCHAR(50)        NOT NULL DEFAULT 'India',
    Phone           NVARCHAR(20)        NULL,
    Email           NVARCHAR(200)       NULL,
    Website         NVARCHAR(200)       NULL,
    BankAccountName NVARCHAR(200)       NULL,
    BankName        NVARCHAR(200)       NULL,
    BankBranch      NVARCHAR(200)       NULL,
    BankAccountNo   NVARCHAR(30)        NULL,
    BankIFSCode     NVARCHAR(15)        NULL,
    GSTRegType      NVARCHAR(20)        NOT NULL DEFAULT 'Regular' CHECK (GSTRegType IN ('Regular','Composition','Unregistered')),
    GSTRateFootwearLow  DECIMAL(5,2)    NOT NULL DEFAULT 5.00,
    GSTRateFootwearHigh DECIMAL(5,2)    NOT NULL DEFAULT 18.00,
    GSTRateOther    DECIMAL(5,2)        NOT NULL DEFAULT 18.00,
    HSNPrefix       NVARCHAR(10)        NULL,
    InvoicePrefix   NVARCHAR(20)        NULL,
    InvoiceFormat   NVARCHAR(100)       NULL,
    FYStartMonth    INT                 NOT NULL DEFAULT 4,
    TermsAndConditions NVARCHAR(MAX)    NULL,
    Declaration     NVARCHAR(MAX)       NULL,
    AuthorisedSignatory NVARCHAR(200)   NULL,
    UpdatedAt       DATETIME2(7)        NULL,
    CONSTRAINT PK_TenantSettings PRIMARY KEY (SettingsId),
    CONSTRAINT FK_TenantSettings_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT UQ_TenantSettings_Tenant UNIQUE (TenantId)
);
GO

-- ============================================
-- License Management
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Licenses' AND schema_id = SCHEMA_ID('auth'))
CREATE TABLE auth.Licenses (
    LicenseId       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    LicenseKey      NVARCHAR(30)        NOT NULL,
    PlanName        NVARCHAR(30)        NOT NULL DEFAULT 'Starter' CHECK (PlanName IN ('Starter','Professional','Enterprise','Trial')),
    Status          NVARCHAR(20)        NOT NULL DEFAULT 'Active' CHECK (Status IN ('Active','Expired','Revoked','Trial')),
    MaxUsers        INT                 NOT NULL DEFAULT 5,
    ValidFrom       DATE                NOT NULL DEFAULT GETDATE(),
    ValidUntil      DATE                NOT NULL,
    ModulesEnabled  NVARCHAR(MAX)       NULL,
    ActivatedBy     UNIQUEIDENTIFIER    NULL,
    ActivatedAt     DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Licenses PRIMARY KEY (LicenseId),
    CONSTRAINT FK_Licenses_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId)
);
GO

-- ============================================
-- Size-wise Order Lines
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrderSizeRuns' AND schema_id = SCHEMA_ID('sales'))
CREATE TABLE sales.OrderSizeRuns (
    OrderSizeRunId  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    OrderLineId     UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NOT NULL,
    Quantity        INT                 NOT NULL DEFAULT 0,
    StockAvailable  INT                 NOT NULL DEFAULT 0,
    CONSTRAINT PK_OrderSizeRuns PRIMARY KEY (OrderSizeRunId),
    CONSTRAINT FK_OrderSizeRuns_OrderLine FOREIGN KEY (OrderLineId) REFERENCES sales.OrderLines(OrderLineId)
);
GO

-- ============================================
-- Insert default tenant settings for EL CURIO
-- ============================================
DECLARE @tenantId UNIQUEIDENTIFIER;
SELECT @tenantId = TenantId FROM auth.Tenants WHERE TenantName = 'EL CURIO';

IF @tenantId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.TenantSettings WHERE TenantId = @tenantId)
BEGIN
    INSERT INTO auth.TenantSettings (TenantId, TradeName, Subtitle, GSTIN, AddressLine1, City, State, Pincode, Phone, Email,
        BankAccountName, BankName, BankBranch, BankAccountNo, BankIFSCode, InvoicePrefix, InvoiceFormat, TermsAndConditions, Declaration, AuthorisedSignatory)
    VALUES (@tenantId, 'SKH EXPORTS', 'Multi-Tenant Retail Distribution', '27AABCE1234F1Z5',
        'Plot No. 17, Sector 5, Industrial Area, Bhiwandi', 'Mumbai', 'Maharashtra', '421302', '9876543210', 'info@elcurio.com',
        'UNICO CREATIONS', 'HDFC BANK', 'RANIPET', '50200073196749', 'HDFC0001295',
        'SKH', 'SKH/{SEQ}/{FY}',
        'GOODS ONCE SOLD WILL NOT BE TAKEN BACK. PAYMENTS HAS TO BE MADE WITHIN THE STIPULATED TIME. SUBJECT TO CHENNAI JURISDICTION.',
        'We declare that this Invoice shows the actual prices of the goods and all the particulars are true and correct. All disputes are subject to Chennai jurisdiction only.',
        'Authorised Signatory');

    -- Insert default trial license
    INSERT INTO auth.Licenses (TenantId, LicenseKey, PlanName, Status, MaxUsers, ValidFrom, ValidUntil, ModulesEnabled)
    VALUES (@tenantId, 'ELCU-RTRP-2024-ENTP', 'Enterprise', 'Active', 100,
        '2024-01-01', '2026-12-31',
        '["Masters","Inventory","Orders","Production","Billing","Reports","Admin","Warehouse"]');
END
GO

PRINT 'New tables and seed data created successfully.';
GO
