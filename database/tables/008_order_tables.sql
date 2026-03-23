-- ============================================================
-- RetailERP - Customer Order Tables
-- ============================================================
USE RetailERP;
GO

CREATE TABLE sales.CustomerOrders (
    OrderId         UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NOT NULL,
    OrderNo         NVARCHAR(50)        NOT NULL,
    OrderDate       DATE                NOT NULL,
    ClientId        UNIQUEIDENTIFIER    NOT NULL,
    StoreId         UNIQUEIDENTIFIER    NOT NULL,
    WarehouseId     UNIQUEIDENTIFIER    NULL,
    TotalQuantity   INT                 NOT NULL DEFAULT 0,
    TotalMRP        DECIMAL(14,2)       NOT NULL DEFAULT 0,
    TotalAmount     DECIMAL(14,2)       NOT NULL DEFAULT 0,
    Status          NVARCHAR(30)        NOT NULL DEFAULT 'DRAFT', -- DRAFT, CONFIRMED, PROCESSING, DISPATCHED, DELIVERED, CANCELLED
    Notes           NVARCHAR(1000)      NULL,
    ConfirmedBy     UNIQUEIDENTIFIER    NULL,
    ConfirmedAt     DATETIME2(7)        NULL,
    CreatedAt       DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(7)        NULL,
    CreatedBy       UNIQUEIDENTIFIER    NULL,
    CONSTRAINT PK_CustomerOrders PRIMARY KEY (OrderId),
    CONSTRAINT FK_CustOrders_Tenant FOREIGN KEY (TenantId) REFERENCES auth.Tenants(TenantId),
    CONSTRAINT FK_CustOrders_Client FOREIGN KEY (ClientId) REFERENCES sales.Clients(ClientId),
    CONSTRAINT FK_CustOrders_Store FOREIGN KEY (StoreId) REFERENCES sales.Stores(StoreId),
    CONSTRAINT FK_CustOrders_Warehouse FOREIGN KEY (WarehouseId) REFERENCES warehouse.Warehouses(WarehouseId),
    CONSTRAINT UQ_CustOrders_No_Tenant UNIQUE (TenantId, OrderNo)
);
GO

CREATE TABLE sales.OrderLines (
    OrderLineId     UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    OrderId         UNIQUEIDENTIFIER    NOT NULL,
    ArticleId       UNIQUEIDENTIFIER    NOT NULL,
    Color           NVARCHAR(100)       NULL,
    EuroSize        INT                 NULL,
    HSNCode         NVARCHAR(20)        NOT NULL,
    MRP             DECIMAL(12,2)       NOT NULL,
    Quantity        INT                 NOT NULL,
    DispatchedQty   INT                 NOT NULL DEFAULT 0,
    LineTotal       DECIMAL(14,2)       NOT NULL,
    StockAvailable  BIT                 NOT NULL DEFAULT 0,
    CONSTRAINT PK_OrderLines PRIMARY KEY (OrderLineId),
    CONSTRAINT FK_OrderLines_Order FOREIGN KEY (OrderId) REFERENCES sales.CustomerOrders(OrderId),
    CONSTRAINT FK_OrderLines_Article FOREIGN KEY (ArticleId) REFERENCES product.Articles(ArticleId),
    CONSTRAINT CK_OrderLines_Qty CHECK (Quantity > 0)
);
GO
