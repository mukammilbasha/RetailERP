-- ============================================================
-- RetailERP - Billing & Invoice Tables
-- ============================================================
USE RetailERP;
GO

CREATE TABLE billing.Invoices (
    InvoiceId       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    InvoiceNo       NVARCHAR(50)        NOT NULL,
    InvoiceDate     DATE                NOT NULL,
    InvoiceType     NVARCHAR(30)        NOT NULL DEFAULT 'TAX_INVOICE', -- TAX_INVOICE, CREDIT_NOTE, DEBIT_NOTE
    OrderId         UNIQUEIDENTIFIER    NULL,
    ClientId        UNIQUEIDENTIFIER    NOT NULL,
    StoreId         UNIQUEIDENTIFIER    NOT NULL,
    -- Billing Address
    BillToName      NVARCHAR(300)       NULL,
    BillToAddress   NVARCHAR(500)       NULL,
    BillToGSTIN     NVARCHAR(15)        NULL,
    BillToState     NVARCHAR(100)       NULL,
    BillToStateCode NVARCHAR(5)         NULL,
    -- Shipping Address
    ShipToName      NVARCHAR(300)       NULL,
    ShipToAddress   NVARCHAR(500)       NULL,
    ShipToGSTIN     NVARCHAR(15)        NULL,
    ShipToState     NVARCHAR(100)       NULL,
    ShipToStateCode NVARCHAR(5)         NULL,
    -- Place of supply determines IGST vs CGST+SGST
    PlaceOfSupply   NVARCHAR(100)       NULL,
    PlaceOfSupplyCode NVARCHAR(5)       NULL,
    IsInterState    BIT                 NOT NULL DEFAULT 0,
    -- Totals
    SubTotal        DECIMAL(14,2)       NOT NULL DEFAULT 0,
    TotalDiscount   DECIMAL(14,2)       NOT NULL DEFAULT 0,
    TaxableAmount   DECIMAL(14,2)       NOT NULL DEFAULT 0,
    CGSTAmount      DECIMAL(14,2)       NOT NULL DEFAULT 0,
    SGSTAmount      DECIMAL(14,2)       NOT NULL DEFAULT 0,
    IGSTAmount      DECIMAL(14,2)       NOT NULL DEFAULT 0,
    TotalGST        DECIMAL(14,2)       NOT NULL DEFAULT 0,
    GrandTotal      DECIMAL(14,2)       NOT NULL DEFAULT 0,
    RoundOff        DECIMAL(8,2)        NOT NULL DEFAULT 0,
    NetPayable      DECIMAL(14,2)       NOT NULL DEFAULT 0,
    -- Status
    Status          NVARCHAR(20)        NOT NULL DEFAULT 'DRAFT', -- DRAFT, FINALIZED, CANCELLED
    IRN             NVARCHAR(100)       NULL, -- e-Invoice IRN
    EWayBillNo      NVARCHAR(50)        NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_Invoices PRIMARY KEY (InvoiceId),
    CONSTRAINT FK_Invoices_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_Invoices_Order FOREIGN KEY (OrderId) REFERENCES sales.CustomerOrders(OrderId),
    CONSTRAINT FK_Invoices_Client FOREIGN KEY (ClientId) REFERENCES sales.Clients(ClientId),
    CONSTRAINT FK_Invoices_Store FOREIGN KEY (StoreId) REFERENCES sales.Stores(StoreId),
    CONSTRAINT UQ_Invoices_No_Tenant UNIQUE (TenantId, InvoiceNo)
);
GO

CREATE TABLE billing.InvoiceLines (
    InvoiceLineId   UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    InvoiceId       UNIQUEIDENTIFIER    NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    ArticleCode     NVARCHAR(50)        NOT NULL,
    ArticleName     NVARCHAR(300)       NOT NULL,
    HSNCode         NVARCHAR(20)        NOT NULL,
    Color           NVARCHAR(100)       NULL,
    EuroSize        INT                 NULL,
    EANCode         NVARCHAR(20)        NULL,
    UOM             NVARCHAR(20)        NOT NULL DEFAULT 'PAIRS',
    Quantity        INT                 NOT NULL,
    MRP             DECIMAL(12,2)       NOT NULL,
    MarginPercent   DECIMAL(5,2)        NOT NULL DEFAULT 0,
    MarginAmount    DECIMAL(12,2)       NOT NULL DEFAULT 0,
    UnitPrice       DECIMAL(12,2)       NOT NULL DEFAULT 0, -- MRP - Margin
    TaxableAmount   DECIMAL(14,2)       NOT NULL DEFAULT 0, -- UnitPrice * Qty
    GSTRate         DECIMAL(5,2)        NOT NULL DEFAULT 18.00,
    CGSTRate        DECIMAL(5,2)        NOT NULL DEFAULT 0,
    CGSTAmount      DECIMAL(12,2)       NOT NULL DEFAULT 0,
    SGSTRate        DECIMAL(5,2)        NOT NULL DEFAULT 0,
    SGSTAmount      DECIMAL(12,2)       NOT NULL DEFAULT 0,
    IGSTRate        DECIMAL(5,2)        NOT NULL DEFAULT 0,
    IGSTAmount      DECIMAL(12,2)       NOT NULL DEFAULT 0,
    TotalAmount     DECIMAL(14,2)       NOT NULL DEFAULT 0,
    CONSTRAINT PK_InvoiceLines PRIMARY KEY (InvoiceLineId),
    CONSTRAINT FK_InvLines_Invoice FOREIGN KEY (InvoiceId) REFERENCES billing.Invoices(InvoiceId),
    CONSTRAINT FK_InvLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

-- Packing Lists
CREATE TABLE billing.PackingLists (
    PackingListId   UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    InvoiceId       UNIQUEIDENTIFIER    NOT NULL,
    PackingNo       NVARCHAR(50)        NOT NULL,
    PackingDate     DATE                NOT NULL,
    TotalCartons    INT                 NOT NULL DEFAULT 0,
    TotalPairs      INT                 NOT NULL DEFAULT 0,
    TransportMode   NVARCHAR(50)        NULL,  -- ROAD, AIR, RAIL, SEA
    LogisticsPartner NVARCHAR(200)      NULL,
    VehicleNumber   NVARCHAR(50)        NULL,
    PlaceOfSupply   NVARCHAR(100)       NULL,
    LRNumber        NVARCHAR(50)        NULL,  -- Lorry Receipt
    LRDate          DATE                NULL,
    Notes           NVARCHAR(500)       NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_PackingLists PRIMARY KEY (PackingListId),
    CONSTRAINT FK_PackingLists_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_PackingLists_Invoice FOREIGN KEY (InvoiceId) REFERENCES billing.Invoices(InvoiceId)
);
GO

CREATE TABLE billing.PackingListLines (
    PackingLineId   UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    PackingListId   UNIQUEIDENTIFIER    NOT NULL,
    CartonNumber    INT                 NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    EuroSize        INT                 NULL,
    Quantity        INT                 NOT NULL,
    CONSTRAINT PK_PackingListLines PRIMARY KEY (PackingLineId),
    CONSTRAINT FK_PackListLines_PackList FOREIGN KEY (PackingListId) REFERENCES billing.PackingLists(PackingListId),
    CONSTRAINT FK_PackListLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId)
);
GO

-- Delivery Notes
CREATE TABLE billing.DeliveryNotes (
    DeliveryNoteId  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    InvoiceId       UNIQUEIDENTIFIER    NOT NULL,
    DeliveryNoteNo  NVARCHAR(50)        NOT NULL,
    DeliveryDate    DATE                NOT NULL,
    ReceivedBy      NVARCHAR(200)       NULL,
    ReceivedAt      DATETIME2(7)        NULL,
    Status          NVARCHAR(20)        NOT NULL DEFAULT 'PENDING', -- PENDING, DELIVERED, PARTIAL
    Notes           NVARCHAR(500)       NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DeliveryNotes PRIMARY KEY (DeliveryNoteId),
    CONSTRAINT FK_DelNotes_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_DelNotes_Invoice FOREIGN KEY (InvoiceId) REFERENCES billing.Invoices(InvoiceId)
);
GO
