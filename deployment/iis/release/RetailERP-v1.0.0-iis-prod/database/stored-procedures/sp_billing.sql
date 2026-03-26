-- ============================================================
-- RetailERP - Billing & GST Stored Procedures
-- ============================================================
USE RetailERP;
GO

CREATE OR ALTER PROCEDURE billing.sp_Invoice_Calculate
    @InvoiceId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IsInterState BIT;
    SELECT @IsInterState = IsInterState FROM billing.Invoices WHERE InvoiceId = @InvoiceId;

    -- Update each invoice line with GST calculations
    UPDATE il SET
        MarginAmount = ROUND(il.MRP * il.MarginPercent / 100, 2),
        UnitPrice = ROUND(il.MRP - (il.MRP * il.MarginPercent / 100), 2),
        TaxableAmount = ROUND((il.MRP - (il.MRP * il.MarginPercent / 100)) * il.Quantity, 2),
        CGSTRate = CASE WHEN @IsInterState = 0 THEN il.GSTRate / 2 ELSE 0 END,
        SGSTRate = CASE WHEN @IsInterState = 0 THEN il.GSTRate / 2 ELSE 0 END,
        IGSTRate = CASE WHEN @IsInterState = 1 THEN il.GSTRate ELSE 0 END,
        CGSTAmount = CASE WHEN @IsInterState = 0
            THEN ROUND(((il.MRP - (il.MRP * il.MarginPercent / 100)) * il.Quantity) * (il.GSTRate / 2) / 100, 2)
            ELSE 0 END,
        SGSTAmount = CASE WHEN @IsInterState = 0
            THEN ROUND(((il.MRP - (il.MRP * il.MarginPercent / 100)) * il.Quantity) * (il.GSTRate / 2) / 100, 2)
            ELSE 0 END,
        IGSTAmount = CASE WHEN @IsInterState = 1
            THEN ROUND(((il.MRP - (il.MRP * il.MarginPercent / 100)) * il.Quantity) * il.GSTRate / 100, 2)
            ELSE 0 END,
        TotalAmount = ROUND(
            ((il.MRP - (il.MRP * il.MarginPercent / 100)) * il.Quantity) +
            ((il.MRP - (il.MRP * il.MarginPercent / 100)) * il.Quantity * il.GSTRate / 100), 2)
    FROM billing.InvoiceLines il
    WHERE il.InvoiceId = @InvoiceId;

    -- Update invoice totals
    UPDATE inv SET
        SubTotal = t.SubTotal,
        TotalDiscount = t.TotalDiscount,
        TaxableAmount = t.TaxableAmount,
        CGSTAmount = t.CGSTAmount,
        SGSTAmount = t.SGSTAmount,
        IGSTAmount = t.IGSTAmount,
        TotalGST = t.TotalGST,
        GrandTotal = t.GrandTotal,
        RoundOff = ROUND(t.GrandTotal, 0) - t.GrandTotal,
        NetPayable = ROUND(t.GrandTotal, 0),
        UpdatedAt = SYSUTCDATETIME()
    FROM billing.Invoices inv
    CROSS APPLY (
        SELECT
            SUM(MRP * Quantity) AS SubTotal,
            SUM(MarginAmount * Quantity) AS TotalDiscount,
            SUM(TaxableAmount) AS TaxableAmount,
            SUM(CGSTAmount) AS CGSTAmount,
            SUM(SGSTAmount) AS SGSTAmount,
            SUM(IGSTAmount) AS IGSTAmount,
            SUM(CGSTAmount + SGSTAmount + IGSTAmount) AS TotalGST,
            SUM(TotalAmount) AS GrandTotal
        FROM billing.InvoiceLines
        WHERE InvoiceId = @InvoiceId
    ) t
    WHERE inv.InvoiceId = @InvoiceId;
END;
GO

CREATE OR ALTER PROCEDURE billing.sp_Invoice_GetById
    @InvoiceId UNIQUEIDENTIFIER,
    @TenantId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- Invoice header
    SELECT i.*, c.ClientName, c.ClientCode, s.StoreName, s.StoreCode
    FROM billing.Invoices i
    INNER JOIN sales.Clients c ON i.ClientId = c.ClientId
    INNER JOIN sales.Stores s ON i.StoreId = s.StoreId
    WHERE i.InvoiceId = @InvoiceId AND i.TenantId = @TenantId;

    -- Invoice lines
    SELECT il.*
    FROM billing.InvoiceLines il
    WHERE il.InvoiceId = @InvoiceId
    ORDER BY il.ArticleCode, il.EuroSize;

    -- Packing list
    SELECT pl.*, pll.*
    FROM billing.PackingLists pl
    LEFT JOIN billing.PackingListLines pll ON pl.PackingListId = pll.PackingListId
    WHERE pl.InvoiceId = @InvoiceId;
END;
GO

-- GST Report
CREATE OR ALTER PROCEDURE billing.sp_GSTReport_Get
    @TenantId UNIQUEIDENTIFIER,
    @FromDate DATE,
    @ToDate DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.InvoiceNo, i.InvoiceDate, i.InvoiceType,
        c.ClientName, c.GSTIN AS ClientGSTIN,
        i.PlaceOfSupply, i.IsInterState,
        il.HSNCode, il.GSTRate,
        SUM(il.Quantity) AS TotalQty,
        SUM(il.TaxableAmount) AS TaxableAmount,
        SUM(il.CGSTAmount) AS CGST,
        SUM(il.SGSTAmount) AS SGST,
        SUM(il.IGSTAmount) AS IGST,
        SUM(il.TotalAmount) AS TotalAmount
    FROM billing.Invoices i
    INNER JOIN billing.InvoiceLines il ON i.InvoiceId = il.InvoiceId
    INNER JOIN sales.Clients c ON i.ClientId = c.ClientId
    WHERE i.TenantId = @TenantId
        AND i.InvoiceDate BETWEEN @FromDate AND @ToDate
        AND i.Status != 'CANCELLED'
    GROUP BY i.InvoiceNo, i.InvoiceDate, i.InvoiceType,
             c.ClientName, c.GSTIN, i.PlaceOfSupply, i.IsInterState,
             il.HSNCode, il.GSTRate
    ORDER BY i.InvoiceDate, i.InvoiceNo;
END;
GO
