using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RetailERP.Billing.Application.Interfaces;
using RetailERP.Billing.Application.Utilities;
using RetailERP.Billing.Domain.Entities;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Billing.Application.Services;

public class BillingService : IBillingService
{
    private readonly DbContext _context;

    public BillingService(DbContext context)
    {
        _context = context;
    }

    // ---------------------------------------------------------------
    // EL CURIO margin calculation - delegates to the pure calculator
    // ---------------------------------------------------------------

    public ElCurioLineResult CalculateElCurioLineItem(decimal mrp, decimal marginPercent, int quantity)
    {
        return ElCurioMarginCalculator.CalculateElCurioLineItem(mrp, marginPercent, quantity);
    }

    // ---------------------------------------------------------------
    // Invoice CRUD
    // ---------------------------------------------------------------

    public async Task<InvoiceDto> CreateInvoiceAsync(
        Guid tenantId, Guid userId, CreateInvoiceRequest request, CancellationToken ct = default)
    {
        if (request.Lines == null || request.Lines.Count == 0)
            throw new ArgumentException("Invoice must contain at least one line item.");

        var invoiceNumber = await GenerateInvoiceNumberAsync(tenantId, ct);

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceNumber = invoiceNumber,
            OrderId = request.OrderId,
            OrderNumber = request.OrderNumber,
            ClientId = request.ClientId,
            ClientName = request.ClientName,
            ClientGSTIN = request.ClientGSTIN,
            ClientAddress = request.ClientAddress,
            StoreId = request.StoreId,
            StoreName = request.StoreName,
            InvoiceDate = request.InvoiceDate ?? DateTime.UtcNow,
            DueDate = request.DueDate,
            SalesType = request.SalesType ?? "Local",
            PONumber = request.PONumber,
            PODate = request.PODate,
            CartonBoxes = request.CartonBoxes,
            Logistic = request.Logistic,
            TransportMode = request.TransportMode,
            VehicleNo = request.VehicleNo,
            PlaceOfSupply = request.PlaceOfSupply,
            IsInterState = request.IsInterState,
            SellerState = request.SellerState,
            BuyerState = request.BuyerState,
            CompanyName = request.CompanyName,
            CompanyAddress = request.CompanyAddress,
            CompanyGSTIN = request.CompanyGSTIN,
            CompanyPAN = request.CompanyPAN,
            BankName = request.BankName,
            BankAccountNo = request.BankAccountNo,
            BankIFSC = request.BankIFSC,
            BankBranch = request.BankBranch,
            Notes = request.Notes,
            Status = "Draft",
            CreatedBy = userId
        };

        // Aggregators
        decimal totalMarginAmount = 0;
        decimal totalGSTPayableValue = 0;
        decimal totalBillingExclGST = 0;
        decimal totalGSTReimbursementValue = 0;
        decimal totalBillingInclGST = 0;
        decimal cgstTotal = 0, sgstTotal = 0, igstTotal = 0;
        int totalQuantity = 0;
        int lineNumber = 1;

        foreach (var line in request.Lines)
        {
            var invoiceLine = CalculateInvoiceLine(line, request.IsInterState, lineNumber);
            invoiceLine.InvoiceId = invoice.Id;
            invoice.Lines.Add(invoiceLine);

            totalMarginAmount += invoiceLine.MarginAmount * invoiceLine.Quantity;
            totalGSTPayableValue += invoiceLine.GSTPayableValue * invoiceLine.Quantity;
            totalBillingExclGST += invoiceLine.UnitPrice * invoiceLine.Quantity;
            totalGSTReimbursementValue += invoiceLine.GSTReimbursementValue * invoiceLine.Quantity;
            totalBillingInclGST += invoiceLine.TotalBilling * invoiceLine.Quantity;
            cgstTotal += invoiceLine.CGSTAmount;
            sgstTotal += invoiceLine.SGSTAmount;
            igstTotal += invoiceLine.IGSTAmount;
            totalQuantity += invoiceLine.Quantity;

            lineNumber++;
        }

        invoice.TotalMarginAmount = Math.Round(totalMarginAmount, 2);
        invoice.TotalGSTPayableValue = Math.Round(totalGSTPayableValue, 2);
        invoice.TotalBillingExclGST = Math.Round(totalBillingExclGST, 2);
        invoice.TotalGSTReimbursementValue = Math.Round(totalGSTReimbursementValue, 2);
        invoice.TotalBillingInclGST = Math.Round(totalBillingInclGST, 2);
        invoice.TotalQuantity = totalQuantity;

        // Standard totals
        invoice.SubTotal = Math.Round(totalBillingExclGST, 2);
        invoice.DiscountAmount = request.DiscountAmount;
        invoice.TaxableAmount = Math.Round(totalBillingExclGST - request.DiscountAmount, 2);
        invoice.CGSTTotal = Math.Round(cgstTotal, 2);
        invoice.SGSTTotal = Math.Round(sgstTotal, 2);
        invoice.IGSTTotal = Math.Round(igstTotal, 2);
        invoice.TotalTax = Math.Round(cgstTotal + sgstTotal + igstTotal, 2);
        invoice.TotalAmount = Math.Round(totalBillingInclGST - request.DiscountAmount, 2);

        _context.Set<Invoice>().Add(invoice);
        await _context.SaveChangesAsync(ct);

        return await GetInvoiceAsync(tenantId, invoice.Id, ct);
    }

    /// <summary>
    /// Applies the EL CURIO margin formula to produce a fully calculated InvoiceLine,
    /// including the CGST/SGST or IGST split for tax-return compliance.
    /// </summary>
    private InvoiceLine CalculateInvoiceLine(CreateInvoiceLineRequest line, bool isInterState, int lineNumber)
    {
        var calc = ElCurioMarginCalculator.CalculateElCurioLineItem(line.MRP, line.MarginPercent, line.Quantity);

        // The GST Reimbursement becomes the split GST for reporting
        var gstRate = calc.GSTReimbursementPercent;
        decimal cgstRate = 0, cgstAmount = 0;
        decimal sgstRate = 0, sgstAmount = 0;
        decimal igstRate = 0, igstAmount = 0;

        // Total reimbursement for this line = per-unit * qty
        var totalReimbursement = Math.Round(calc.GSTReimbursementValue * line.Quantity, 2);

        if (isInterState)
        {
            igstRate = gstRate;
            igstAmount = totalReimbursement;
        }
        else
        {
            cgstRate = Math.Round(gstRate / 2m, 2);
            sgstRate = Math.Round(gstRate / 2m, 2);
            cgstAmount = Math.Round(totalReimbursement / 2m, 2);
            sgstAmount = totalReimbursement - cgstAmount; // avoid rounding mismatch
        }

        // Serialize size breakdown if provided
        string? sizeBreakdownJson = null;
        if (line.SizeBreakdown != null && line.SizeBreakdown.Count > 0)
        {
            sizeBreakdownJson = JsonSerializer.Serialize(line.SizeBreakdown);
        }

        return new InvoiceLine
        {
            InvoiceLineId = Guid.NewGuid(),
            LineNumber = lineNumber,
            ArticleId = line.ArticleId,
            SKU = line.SKU,
            ArticleName = line.ArticleName,
            Description = line.Description,
            Size = line.Size,
            Color = line.Color,
            HSNCode = line.HSNCode,
            UOM = line.UOM,
            SizeBreakdownJson = sizeBreakdownJson,
            Quantity = line.Quantity,
            MRP = line.MRP,
            MarginPercent = line.MarginPercent,
            MarginAmount = calc.MarginAmount,
            GSTPayablePercent = calc.GSTPayablePercent,
            GSTPayableValue = calc.GSTPayableValue,
            UnitPrice = calc.UnitPrice,
            GSTReimbursementPercent = calc.GSTReimbursementPercent,
            GSTReimbursementValue = calc.GSTReimbursementValue,
            TotalBilling = calc.TotalBilling,
            TaxableAmount = calc.TaxableValue,
            GSTRate = gstRate,
            CGSTRate = cgstRate,
            CGSTAmount = cgstAmount,
            SGSTRate = sgstRate,
            SGSTAmount = sgstAmount,
            IGSTRate = igstRate,
            IGSTAmount = igstAmount,
            LineTotal = calc.LineTotal
        };
    }

    public async Task<InvoiceDto> GetInvoiceAsync(Guid tenantId, Guid invoiceId, CancellationToken ct = default)
    {
        var invoice = await _context.Set<Invoice>()
            .Include(i => i.Lines.OrderBy(l => l.LineNumber))
            .Include(i => i.PackingLists)
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Invoice not found");

        return MapToDto(invoice);
    }

    public async Task<PagedResult<InvoiceListDto>> GetInvoicesAsync(
        Guid tenantId, InvoiceQueryParams query, CancellationToken ct = default)
    {
        var q = _context.Set<Invoice>()
            .Where(i => i.TenantId == tenantId && i.IsActive);

        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(i => i.Status == query.Status);
        if (query.ClientId.HasValue)
            q = q.Where(i => i.ClientId == query.ClientId.Value);
        if (query.StoreId.HasValue)
            q = q.Where(i => i.StoreId == query.StoreId.Value);
        if (!string.IsNullOrWhiteSpace(query.SalesType))
            q = q.Where(i => i.SalesType == query.SalesType);
        if (!string.IsNullOrWhiteSpace(query.SearchTerm))
            q = q.Where(i => i.InvoiceNumber.Contains(query.SearchTerm)
                          || i.ClientName.Contains(query.SearchTerm)
                          || (i.PONumber != null && i.PONumber.Contains(query.SearchTerm)));
        if (query.FromDate.HasValue)
            q = q.Where(i => i.InvoiceDate >= query.FromDate.Value);
        if (query.ToDate.HasValue)
            q = q.Where(i => i.InvoiceDate <= query.ToDate.Value);

        var totalCount = await q.CountAsync(ct);

        var items = await q
            .OrderByDescending(i => i.InvoiceDate)
            .ThenByDescending(i => i.InvoiceNumber)
            .Skip((query.PageNumber - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(i => new InvoiceListDto
            {
                InvoiceId = i.Id,
                InvoiceNumber = i.InvoiceNumber,
                ClientName = i.ClientName,
                ClientId = i.ClientId,
                StoreId = i.StoreId,
                StoreName = i.StoreName,
                SalesType = i.SalesType,
                InvoiceDate = i.InvoiceDate,
                DueDate = i.DueDate,
                Status = i.Status,
                TotalQuantity = i.TotalQuantity,
                TotalAmount = i.TotalAmount,
                TotalBillingInclGST = i.TotalBillingInclGST,
                PaidAmount = i.PaidAmount,
                BalanceAmount = i.TotalAmount - i.PaidAmount
            })
            .ToListAsync(ct);

        return new PagedResult<InvoiceListDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = query.PageNumber,
            PageSize = query.PageSize
        };
    }

    public async Task<InvoiceDto> IssueInvoiceAsync(Guid tenantId, Guid invoiceId, CancellationToken ct = default)
    {
        var invoice = await _context.Set<Invoice>()
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Invoice not found");

        if (invoice.Status != "Draft")
            throw new InvalidOperationException($"Invoice cannot be issued. Current status: {invoice.Status}");

        invoice.Status = "Issued";
        invoice.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return await GetInvoiceAsync(tenantId, invoiceId, ct);
    }

    public async Task<InvoiceDto> CancelInvoiceAsync(Guid tenantId, Guid invoiceId, CancellationToken ct = default)
    {
        var invoice = await _context.Set<Invoice>()
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Invoice not found");

        if (invoice.Status is "Paid" or "Cancelled")
            throw new InvalidOperationException($"Invoice cannot be cancelled. Current status: {invoice.Status}");

        invoice.Status = "Cancelled";
        invoice.IsActive = false;
        invoice.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return await GetInvoiceAsync(tenantId, invoiceId, ct);
    }

    public async Task<InvoiceDto> RecordPaymentAsync(
        Guid tenantId, Guid invoiceId, decimal amount, CancellationToken ct = default)
    {
        var invoice = await _context.Set<Invoice>()
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Invoice not found");

        if (invoice.Status is "Draft" or "Cancelled")
            throw new InvalidOperationException($"Cannot record payment. Invoice status: {invoice.Status}");

        if (amount <= 0)
            throw new ArgumentException("Payment amount must be positive");

        invoice.PaidAmount += amount;

        if (invoice.PaidAmount >= invoice.TotalAmount)
            invoice.Status = "Paid";
        else
            invoice.Status = "PartiallyPaid";

        invoice.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return await GetInvoiceAsync(tenantId, invoiceId, ct);
    }

    // ---------------------------------------------------------------
    // Invoice Update & Delete
    // ---------------------------------------------------------------

    public async Task<InvoiceDto> UpdateInvoiceAsync(
        Guid tenantId, Guid invoiceId, UpdateInvoiceRequest request, CancellationToken ct = default)
    {
        // Load invoice WITHOUT lines to avoid EF navigation fixup issues during update
        var invoice = await _context.Set<Invoice>()
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Invoice not found");

        if (invoice.Status != "Draft")
            throw new InvalidOperationException("Only Draft invoices can be updated.");

        if (request.Lines == null || request.Lines.Count == 0)
            throw new ArgumentException("Invoice must have at least one line item.");

        // Load and delete existing lines separately (avoid EF navigation collection interference)
        var existingLines = await _context.Set<InvoiceLine>()
            .Where(l => l.InvoiceId == invoiceId)
            .ToListAsync(ct);
        _context.Set<InvoiceLine>().RemoveRange(existingLines);
        await _context.SaveChangesAsync(ct); // commit deletions; entities become Detached

        // Update header fields
        invoice.InvoiceDate    = request.InvoiceDate ?? invoice.InvoiceDate;
        invoice.DueDate        = request.DueDate;
        invoice.PONumber       = request.PONumber;
        invoice.PODate         = request.PODate;
        invoice.SalesType      = request.SalesType ?? invoice.SalesType;
        invoice.CartonBoxes    = request.CartonBoxes;
        invoice.Logistic       = request.Logistic;
        invoice.TransportMode  = request.TransportMode;
        invoice.VehicleNo      = request.VehicleNo;
        invoice.PlaceOfSupply  = request.PlaceOfSupply;
        invoice.IsInterState   = request.IsInterState;
        invoice.SellerState    = request.SellerState;
        invoice.BuyerState     = request.BuyerState;
        invoice.DiscountAmount = request.DiscountAmount;
        invoice.Notes          = request.Notes;
        invoice.UpdatedAt      = DateTime.UtcNow;

        decimal totalMarginAmount = 0, totalGSTPayableValue = 0, totalBillingExclGST = 0;
        decimal totalGSTReimbursementValue = 0, totalBillingInclGST = 0;
        decimal cgstTotal = 0, sgstTotal = 0, igstTotal = 0;
        int totalQuantity = 0, lineNumber = 1;

        foreach (var line in request.Lines)
        {
            var invoiceLine = CalculateInvoiceLine(line, request.IsInterState, lineNumber);
            invoiceLine.InvoiceId = invoice.Id;
            // Add directly via DbSet (not via invoice.Lines) to avoid nav fixup
            _context.Set<InvoiceLine>().Add(invoiceLine);

            totalMarginAmount            += invoiceLine.MarginAmount * invoiceLine.Quantity;
            totalGSTPayableValue         += invoiceLine.GSTPayableValue * invoiceLine.Quantity;
            totalBillingExclGST          += invoiceLine.UnitPrice * invoiceLine.Quantity;
            totalGSTReimbursementValue   += invoiceLine.GSTReimbursementValue * invoiceLine.Quantity;
            totalBillingInclGST          += invoiceLine.TotalBilling * invoiceLine.Quantity;
            cgstTotal += invoiceLine.CGSTAmount;
            sgstTotal += invoiceLine.SGSTAmount;
            igstTotal += invoiceLine.IGSTAmount;
            totalQuantity += invoiceLine.Quantity;
            lineNumber++;
        }

        invoice.TotalMarginAmount          = Math.Round(totalMarginAmount, 2);
        invoice.TotalGSTPayableValue       = Math.Round(totalGSTPayableValue, 2);
        invoice.TotalBillingExclGST        = Math.Round(totalBillingExclGST, 2);
        invoice.TotalGSTReimbursementValue = Math.Round(totalGSTReimbursementValue, 2);
        invoice.TotalBillingInclGST        = Math.Round(totalBillingInclGST, 2);
        invoice.TotalQuantity              = totalQuantity;
        invoice.SubTotal                   = Math.Round(totalBillingExclGST, 2);
        invoice.TaxableAmount              = Math.Round(totalBillingExclGST - request.DiscountAmount, 2);
        invoice.CGSTTotal                  = Math.Round(cgstTotal, 2);
        invoice.SGSTTotal                  = Math.Round(sgstTotal, 2);
        invoice.IGSTTotal                  = Math.Round(igstTotal, 2);
        invoice.TotalTax                   = Math.Round(cgstTotal + sgstTotal + igstTotal, 2);
        invoice.TotalAmount                = Math.Round(totalBillingInclGST - request.DiscountAmount, 2);

        await _context.SaveChangesAsync(ct);
        return await GetInvoiceAsync(tenantId, invoiceId, ct);
    }

    public async Task DeleteInvoiceAsync(Guid tenantId, Guid invoiceId, CancellationToken ct = default)
    {
        var invoice = await _context.Set<Invoice>()
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Invoice not found");

        if (invoice.Status is "Paid")
            throw new InvalidOperationException("Paid invoices cannot be deleted.");

        invoice.IsActive  = false;
        invoice.Status    = "Cancelled";
        invoice.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    // ---------------------------------------------------------------
    // Packing Update & Delete
    // ---------------------------------------------------------------

    public async Task<PackingListDto> UpdatePackingStatusAsync(
        Guid tenantId, Guid packingListId, string status, CancellationToken ct = default)
    {
        var validStatuses = new[] { "Draft", "Packed", "Dispatched" };
        if (!validStatuses.Contains(status))
            throw new ArgumentException($"Invalid status. Allowed: {string.Join(", ", validStatuses)}");

        var pl = await _context.Set<PackingList>()
            .FirstOrDefaultAsync(p => p.Id == packingListId && p.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Packing list not found");

        pl.Status    = status;
        pl.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return await GetPackingListAsync(tenantId, packingListId, ct);
    }

    public async Task DeletePackingListAsync(Guid tenantId, Guid packingListId, CancellationToken ct = default)
    {
        var pl = await _context.Set<PackingList>()
            .FirstOrDefaultAsync(p => p.Id == packingListId && p.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Packing list not found");

        if (pl.Status == "Dispatched")
            throw new InvalidOperationException("Dispatched packing lists cannot be deleted.");

        pl.IsActive  = false;
        pl.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    // ---------------------------------------------------------------
    // Reports
    // ---------------------------------------------------------------

    public async Task<List<GSTReportRow>> GetGSTReportAsync(
        Guid tenantId, DateTime fromDate, DateTime toDate, CancellationToken ct = default)
    {
        var invoices = await _context.Set<Invoice>()
            .Where(i => i.TenantId == tenantId
                     && i.IsActive
                     && i.Status != "Cancelled"
                     && i.InvoiceDate >= fromDate.Date
                     && i.InvoiceDate <= toDate.Date)
            .OrderBy(i => i.InvoiceDate)
            .ThenBy(i => i.InvoiceNumber)
            .ToListAsync(ct);

        return invoices.Select(i => new GSTReportRow
        {
            Period              = i.InvoiceDate.ToString("yyyy-MM"),
            InvoiceNumber       = i.InvoiceNumber,
            InvoiceDate         = i.InvoiceDate,
            ClientName          = i.ClientName,
            SalesType           = i.SalesType,
            TaxableAmount       = i.TaxableAmount,
            CGSTAmount          = i.CGSTTotal,
            SGSTAmount          = i.SGSTTotal,
            IGSTAmount          = i.IGSTTotal,
            TotalGST            = i.TotalTax,
            TotalBillingInclGST = i.TotalBillingInclGST
        }).ToList();
    }

    public async Task<List<SalesReportRow>> GetSalesReportAsync(
        Guid tenantId, DateTime fromDate, DateTime toDate, CancellationToken ct = default)
    {
        var invoices = await _context.Set<Invoice>()
            .Where(i => i.TenantId == tenantId
                     && i.IsActive
                     && i.Status != "Cancelled"
                     && i.InvoiceDate >= fromDate.Date
                     && i.InvoiceDate <= toDate.Date)
            .ToListAsync(ct);

        return invoices
            .GroupBy(i => i.InvoiceDate.ToString("yyyy-MM"))
            .OrderBy(g => g.Key)
            .Select(g => new SalesReportRow
            {
                Period              = g.Key,
                InvoiceCount        = g.Count(),
                TotalQuantity       = g.Sum(i => i.TotalQuantity),
                SubTotal            = g.Sum(i => i.SubTotal),
                TotalDiscount       = g.Sum(i => i.DiscountAmount),
                TotalTax            = g.Sum(i => i.TotalTax),
                TotalAmount         = g.Sum(i => i.TotalAmount),
                LocalSalesAmount    = g.Where(i => i.SalesType == "Local").Sum(i => i.TotalAmount),
                ExportSalesAmount   = g.Where(i => i.SalesType == "Export").Sum(i => i.TotalAmount),
                PaidAmount          = g.Sum(i => i.PaidAmount),
                BalanceAmount       = g.Sum(i => i.TotalAmount - i.PaidAmount)
            }).ToList();
    }

    // ---------------------------------------------------------------
    // Print & Delivery
    // ---------------------------------------------------------------

    public async Task<InvoicePrintDto> GetInvoicePrintDataAsync(
        Guid tenantId, Guid invoiceId, CancellationToken ct = default)
    {
        var invoice = await _context.Set<Invoice>()
            .Include(i => i.Lines.OrderBy(l => l.LineNumber))
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Invoice not found");

        var dto = MapToDto(invoice);

        return new InvoicePrintDto
        {
            Invoice = dto,
            CompanyName = invoice.CompanyName ?? string.Empty,
            CompanyAddress = invoice.CompanyAddress ?? string.Empty,
            CompanyGSTIN = invoice.CompanyGSTIN ?? string.Empty,
            CompanyPAN = invoice.CompanyPAN ?? string.Empty,
            BankName = invoice.BankName ?? string.Empty,
            BankAccountNo = invoice.BankAccountNo ?? string.Empty,
            BankIFSC = invoice.BankIFSC ?? string.Empty,
            BankBranch = invoice.BankBranch ?? string.Empty,
            TotalAmountInWords = NumberToWordsConverter.NumberToWordsIndian(invoice.TotalAmount),
            TotalBillingInclGSTInWords = NumberToWordsConverter.NumberToWordsIndian(invoice.TotalBillingInclGST)
        };
    }

    public async Task<DeliveryNoteDataDto> GetDeliveryNoteDataAsync(
        Guid tenantId, Guid invoiceId, CancellationToken ct = default)
    {
        var invoice = await _context.Set<Invoice>()
            .Include(i => i.Lines.OrderBy(l => l.LineNumber))
            .Include(i => i.PackingLists)
                .ThenInclude(p => p.Lines)
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Invoice not found");

        return new DeliveryNoteDataDto
        {
            InvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            InvoiceDate = invoice.InvoiceDate,
            ClientName = invoice.ClientName,
            ClientAddress = invoice.ClientAddress,
            ClientGSTIN = invoice.ClientGSTIN,
            SalesType = invoice.SalesType,
            PONumber = invoice.PONumber,
            PODate = invoice.PODate,
            CartonBoxes = invoice.CartonBoxes,
            Logistic = invoice.Logistic,
            TransportMode = invoice.TransportMode,
            VehicleNo = invoice.VehicleNo,
            PlaceOfSupply = invoice.PlaceOfSupply,
            TotalQuantity = invoice.TotalQuantity,
            Lines = invoice.Lines.Select(l => new DeliveryLineDto
            {
                LineNumber = l.LineNumber,
                ArticleId = l.ArticleId,
                ArticleName = l.ArticleName,
                Description = l.Description,
                HSNCode = l.HSNCode,
                Color = l.Color,
                UOM = l.UOM,
                SizeBreakdown = DeserializeSizeBreakdown(l.SizeBreakdownJson),
                Quantity = l.Quantity,
                MRP = l.MRP
            }).ToList(),
            PackingLists = invoice.PackingLists.Select(MapPackingListToDto).ToList()
        };
    }

    // ---------------------------------------------------------------
    // Packing CRUD
    // ---------------------------------------------------------------

    public async Task<PackingListDto> CreatePackingListAsync(
        Guid tenantId, Guid userId, CreatePackingListRequest request, CancellationToken ct = default)
    {
        var invoice = await _context.Set<Invoice>()
            .FirstOrDefaultAsync(i => i.Id == request.InvoiceId && i.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Invoice not found");

        var packingNumber = await GeneratePackingNumberAsync(tenantId, ct);

        var packingList = new PackingList
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PackingNumber = packingNumber,
            InvoiceId = request.InvoiceId,
            WarehouseId = request.WarehouseId,
            TotalBoxes = request.TotalBoxes,
            TotalWeight = request.TotalWeight,
            Notes = request.Notes,
            Status = "Draft",
            CreatedBy = userId
        };

        foreach (var line in request.Lines)
        {
            string? sizeBreakdownJson = null;
            if (line.SizeBreakdown != null && line.SizeBreakdown.Count > 0)
            {
                sizeBreakdownJson = JsonSerializer.Serialize(line.SizeBreakdown);
            }

            packingList.Lines.Add(new PackingListLine
            {
                PackingListLineId = Guid.NewGuid(),
                PackingListId = packingList.Id,
                ArticleId = line.ArticleId,
                SKU = line.SKU,
                ArticleName = line.ArticleName,
                Description = line.Description,
                Size = line.Size,
                Color = line.Color,
                HSNCode = line.HSNCode,
                Quantity = line.Quantity,
                BoxNumber = line.BoxNumber,
                Weight = line.Weight,
                SizeBreakdownJson = sizeBreakdownJson
            });
        }

        _context.Set<PackingList>().Add(packingList);
        await _context.SaveChangesAsync(ct);

        return await GetPackingListAsync(tenantId, packingList.Id, ct);
    }

    public async Task<PackingListDto> GetPackingListAsync(Guid tenantId, Guid packingListId, CancellationToken ct = default)
    {
        var pl = await _context.Set<PackingList>()
            .Include(p => p.Lines)
            .Include(p => p.DeliveryNotes)
            .FirstOrDefaultAsync(p => p.Id == packingListId && p.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Packing list not found");

        return MapPackingListToDto(pl);
    }

    public async Task<List<PackingListDto>> GetPackingListsByInvoiceAsync(
        Guid tenantId, Guid invoiceId, CancellationToken ct = default)
    {
        var lists = await _context.Set<PackingList>()
            .Include(p => p.Lines)
            .Include(p => p.DeliveryNotes)
            .Where(p => p.TenantId == tenantId && p.InvoiceId == invoiceId)
            .OrderByDescending(p => p.PackingDate)
            .ToListAsync(ct);

        return lists.Select(MapPackingListToDto).ToList();
    }

    public async Task<PagedResult<PackingListSummaryDto>> GetPackingListsPagedAsync(
        Guid tenantId, PackingQueryParams query, CancellationToken ct = default)
    {
        var q = _context.Set<PackingList>()
            .Where(p => p.TenantId == tenantId && p.IsActive);

        if (query.InvoiceId.HasValue)
            q = q.Where(p => p.InvoiceId == query.InvoiceId.Value);
        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(p => p.Status == query.Status);
        if (!string.IsNullOrWhiteSpace(query.SearchTerm))
            q = q.Where(p => p.PackingNumber.Contains(query.SearchTerm));
        if (query.FromDate.HasValue)
            q = q.Where(p => p.PackingDate >= query.FromDate.Value);
        if (query.ToDate.HasValue)
            q = q.Where(p => p.PackingDate <= query.ToDate.Value);

        var totalCount = await q.CountAsync(ct);

        var items = await q
            .OrderByDescending(p => p.PackingDate)
            .Skip((query.PageNumber - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(p => new PackingListSummaryDto
            {
                PackingListId = p.Id,
                PackingNumber = p.PackingNumber,
                InvoiceId = p.InvoiceId,
                Status = p.Status,
                TotalBoxes = p.TotalBoxes,
                TotalWeight = p.TotalWeight,
                PackingDate = p.PackingDate,
                LineCount = p.Lines.Count
            })
            .ToListAsync(ct);

        return new PagedResult<PackingListSummaryDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = query.PageNumber,
            PageSize = query.PageSize
        };
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private async Task<string> GenerateInvoiceNumberAsync(Guid tenantId, CancellationToken ct)
    {
        var today = DateTime.UtcNow;
        var prefix = $"INV-{today:yyyyMM}";
        var last = await _context.Set<Invoice>()
            .Where(i => i.TenantId == tenantId && i.InvoiceNumber.StartsWith(prefix))
            .OrderByDescending(i => i.InvoiceNumber)
            .FirstOrDefaultAsync(ct);

        var sequence = 1;
        if (last != null)
        {
            var lastSeq = last.InvoiceNumber.Split('-').Last();
            if (int.TryParse(lastSeq, out var parsed))
                sequence = parsed + 1;
        }

        return $"{prefix}-{sequence:D4}";
    }

    private async Task<string> GeneratePackingNumberAsync(Guid tenantId, CancellationToken ct)
    {
        var today = DateTime.UtcNow;
        var prefix = $"PL-{today:yyyyMM}";
        var last = await _context.Set<PackingList>()
            .Where(p => p.TenantId == tenantId && p.PackingNumber.StartsWith(prefix))
            .OrderByDescending(p => p.PackingNumber)
            .FirstOrDefaultAsync(ct);

        var sequence = 1;
        if (last != null)
        {
            var lastSeq = last.PackingNumber.Split('-').Last();
            if (int.TryParse(lastSeq, out var parsed))
                sequence = parsed + 1;
        }

        return $"{prefix}-{sequence:D4}";
    }

    private static Dictionary<string, int>? DeserializeSizeBreakdown(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, int>>(json);
        }
        catch
        {
            return null;
        }
    }

    // ---------------------------------------------------------------
    // Mapping
    // ---------------------------------------------------------------

    private static InvoiceDto MapToDto(Invoice invoice) => new()
    {
        InvoiceId = invoice.Id,
        InvoiceNumber = invoice.InvoiceNumber,
        OrderId = invoice.OrderId,
        OrderNumber = invoice.OrderNumber,
        ClientId = invoice.ClientId,
        ClientName = invoice.ClientName,
        ClientGSTIN = invoice.ClientGSTIN,
        ClientAddress = invoice.ClientAddress,
        StoreId = invoice.StoreId,
        StoreName = invoice.StoreName,
        InvoiceDate = invoice.InvoiceDate,
        DueDate = invoice.DueDate,
        Status = invoice.Status,
        SalesType = invoice.SalesType,
        PONumber = invoice.PONumber,
        PODate = invoice.PODate,
        CartonBoxes = invoice.CartonBoxes,
        Logistic = invoice.Logistic,
        TransportMode = invoice.TransportMode,
        VehicleNo = invoice.VehicleNo,
        PlaceOfSupply = invoice.PlaceOfSupply,
        IsInterState = invoice.IsInterState,
        SellerState = invoice.SellerState,
        BuyerState = invoice.BuyerState,
        SubTotal = invoice.SubTotal,
        DiscountAmount = invoice.DiscountAmount,
        TaxableAmount = invoice.TaxableAmount,
        CGSTTotal = invoice.CGSTTotal,
        SGSTTotal = invoice.SGSTTotal,
        IGSTTotal = invoice.IGSTTotal,
        TotalTax = invoice.TotalTax,
        TotalAmount = invoice.TotalAmount,
        TotalMarginAmount = invoice.TotalMarginAmount,
        TotalGSTPayableValue = invoice.TotalGSTPayableValue,
        TotalBillingExclGST = invoice.TotalBillingExclGST,
        TotalGSTReimbursementValue = invoice.TotalGSTReimbursementValue,
        TotalBillingInclGST = invoice.TotalBillingInclGST,
        TotalQuantity = invoice.TotalQuantity,
        PaidAmount = invoice.PaidAmount,
        BalanceAmount = invoice.TotalAmount - invoice.PaidAmount,
        Notes = invoice.Notes,
        Lines = invoice.Lines.Select(l => new InvoiceLineDto
        {
            InvoiceLineId = l.InvoiceLineId,
            LineNumber = l.LineNumber,
            ArticleId = l.ArticleId,
            SKU = l.SKU,
            ArticleName = l.ArticleName,
            Description = l.Description,
            Size = l.Size,
            Color = l.Color,
            HSNCode = l.HSNCode,
            UOM = l.UOM,
            SizeBreakdown = DeserializeSizeBreakdown(l.SizeBreakdownJson),
            Quantity = l.Quantity,
            MRP = l.MRP,
            MarginPercent = l.MarginPercent,
            MarginAmount = l.MarginAmount,
            GSTPayablePercent = l.GSTPayablePercent,
            GSTPayableValue = l.GSTPayableValue,
            UnitPrice = l.UnitPrice,
            GSTReimbursementPercent = l.GSTReimbursementPercent,
            GSTReimbursementValue = l.GSTReimbursementValue,
            TotalBilling = l.TotalBilling,
            TaxableAmount = l.TaxableAmount,
            GSTRate = l.GSTRate,
            CGSTRate = l.CGSTRate,
            CGSTAmount = l.CGSTAmount,
            SGSTRate = l.SGSTRate,
            SGSTAmount = l.SGSTAmount,
            IGSTRate = l.IGSTRate,
            IGSTAmount = l.IGSTAmount,
            LineTotal = l.LineTotal
        }).ToList()
    };

    private static PackingListDto MapPackingListToDto(PackingList pl) => new()
    {
        PackingListId = pl.Id,
        PackingNumber = pl.PackingNumber,
        InvoiceId = pl.InvoiceId,
        WarehouseId = pl.WarehouseId,
        Status = pl.Status,
        TotalBoxes = pl.TotalBoxes,
        TotalWeight = pl.TotalWeight,
        PackingDate = pl.PackingDate,
        Notes = pl.Notes,
        Lines = pl.Lines.Select(l => new PackingListLineDto
        {
            PackingListLineId = l.PackingListLineId,
            ArticleId = l.ArticleId,
            SKU = l.SKU,
            ArticleName = l.ArticleName,
            Description = l.Description,
            Size = l.Size,
            Color = l.Color,
            HSNCode = l.HSNCode,
            Quantity = l.Quantity,
            BoxNumber = l.BoxNumber,
            Weight = l.Weight,
            SizeBreakdown = DeserializeSizeBreakdown(l.SizeBreakdownJson)
        }).ToList(),
        DeliveryNotes = pl.DeliveryNotes.Select(d => new DeliveryNoteDto
        {
            DeliveryNoteId = d.Id,
            DeliveryNumber = d.DeliveryNumber,
            TransporterName = d.TransporterName,
            VehicleNumber = d.VehicleNumber,
            LRNumber = d.LRNumber,
            DispatchDate = d.DispatchDate,
            DeliveryDate = d.DeliveryDate,
            Status = d.Status
        }).ToList()
    };
}

// ===================================================================
// DTOs
// ===================================================================

public class InvoiceDto
{
    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public Guid ClientId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string? ClientGSTIN { get; set; }
    public string? ClientAddress { get; set; }
    public Guid? StoreId { get; set; }
    public string? StoreName { get; set; }
    public DateTime InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string SalesType { get; set; } = "Local";
    public string? PONumber { get; set; }
    public DateTime? PODate { get; set; }
    public int CartonBoxes { get; set; }
    public string? Logistic { get; set; }
    public string? TransportMode { get; set; }
    public string? VehicleNo { get; set; }
    public string? PlaceOfSupply { get; set; }
    public bool IsInterState { get; set; }
    public string? SellerState { get; set; }
    public string? BuyerState { get; set; }
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal CGSTTotal { get; set; }
    public decimal SGSTTotal { get; set; }
    public decimal IGSTTotal { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalMarginAmount { get; set; }
    public decimal TotalGSTPayableValue { get; set; }
    public decimal TotalBillingExclGST { get; set; }
    public decimal TotalGSTReimbursementValue { get; set; }
    public decimal TotalBillingInclGST { get; set; }
    public int TotalQuantity { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public string? Notes { get; set; }
    public List<InvoiceLineDto> Lines { get; set; } = new();
}

public class InvoiceLineDto
{
    public Guid InvoiceLineId { get; set; }
    public int LineNumber { get; set; }
    public Guid ArticleId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? ArticleName { get; set; }
    public string? Description { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string? HSNCode { get; set; }
    public string? UOM { get; set; }
    public Dictionary<string, int>? SizeBreakdown { get; set; }
    public int Quantity { get; set; }
    public decimal MRP { get; set; }
    public decimal MarginPercent { get; set; }
    public decimal MarginAmount { get; set; }
    public decimal GSTPayablePercent { get; set; }
    public decimal GSTPayableValue { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal GSTReimbursementPercent { get; set; }
    public decimal GSTReimbursementValue { get; set; }
    public decimal TotalBilling { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal GSTRate { get; set; }
    public decimal CGSTRate { get; set; }
    public decimal CGSTAmount { get; set; }
    public decimal SGSTRate { get; set; }
    public decimal SGSTAmount { get; set; }
    public decimal IGSTRate { get; set; }
    public decimal IGSTAmount { get; set; }
    public decimal LineTotal { get; set; }
}

public class InvoiceListDto
{
    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public Guid ClientId { get; set; }
    public Guid? StoreId { get; set; }
    public string? StoreName { get; set; }
    public string SalesType { get; set; } = "Local";
    public DateTime InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public int TotalQuantity { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalBillingInclGST { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
}

public class InvoicePrintDto
{
    public InvoiceDto Invoice { get; set; } = null!;
    public string CompanyName { get; set; } = string.Empty;
    public string CompanyAddress { get; set; } = string.Empty;
    public string CompanyGSTIN { get; set; } = string.Empty;
    public string CompanyPAN { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string BankAccountNo { get; set; } = string.Empty;
    public string BankIFSC { get; set; } = string.Empty;
    public string BankBranch { get; set; } = string.Empty;
    public string TotalAmountInWords { get; set; } = string.Empty;
    public string TotalBillingInclGSTInWords { get; set; } = string.Empty;
}

public class DeliveryNoteDataDto
{
    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string? ClientAddress { get; set; }
    public string? ClientGSTIN { get; set; }
    public string SalesType { get; set; } = "Local";
    public string? PONumber { get; set; }
    public DateTime? PODate { get; set; }
    public int CartonBoxes { get; set; }
    public string? Logistic { get; set; }
    public string? TransportMode { get; set; }
    public string? VehicleNo { get; set; }
    public string? PlaceOfSupply { get; set; }
    public int TotalQuantity { get; set; }
    public List<DeliveryLineDto> Lines { get; set; } = new();
    public List<PackingListDto> PackingLists { get; set; } = new();
}

public class DeliveryLineDto
{
    public int LineNumber { get; set; }
    public Guid ArticleId { get; set; }
    public string? ArticleName { get; set; }
    public string? Description { get; set; }
    public string? HSNCode { get; set; }
    public string? Color { get; set; }
    public string? UOM { get; set; }
    public Dictionary<string, int>? SizeBreakdown { get; set; }
    public int Quantity { get; set; }
    public decimal MRP { get; set; }
}

public class PackingListDto
{
    public Guid PackingListId { get; set; }
    public string PackingNumber { get; set; } = string.Empty;
    public Guid InvoiceId { get; set; }
    public Guid? WarehouseId { get; set; }
    public string Status { get; set; } = string.Empty;
    public int TotalBoxes { get; set; }
    public decimal TotalWeight { get; set; }
    public DateTime PackingDate { get; set; }
    public string? Notes { get; set; }
    public List<PackingListLineDto> Lines { get; set; } = new();
    public List<DeliveryNoteDto> DeliveryNotes { get; set; } = new();
}

public class PackingListLineDto
{
    public Guid PackingListLineId { get; set; }
    public Guid ArticleId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? ArticleName { get; set; }
    public string? Description { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string? HSNCode { get; set; }
    public int Quantity { get; set; }
    public int BoxNumber { get; set; }
    public decimal Weight { get; set; }
    public Dictionary<string, int>? SizeBreakdown { get; set; }
}

public class PackingListSummaryDto
{
    public Guid PackingListId { get; set; }
    public string PackingNumber { get; set; } = string.Empty;
    public Guid InvoiceId { get; set; }
    public string Status { get; set; } = string.Empty;
    public int TotalBoxes { get; set; }
    public decimal TotalWeight { get; set; }
    public DateTime PackingDate { get; set; }
    public int LineCount { get; set; }
}

public class DeliveryNoteDto
{
    public Guid DeliveryNoteId { get; set; }
    public string DeliveryNumber { get; set; } = string.Empty;
    public string? TransporterName { get; set; }
    public string? VehicleNumber { get; set; }
    public string? LRNumber { get; set; }
    public DateTime? DispatchDate { get; set; }
    public DateTime? DeliveryDate { get; set; }
    public string Status { get; set; } = string.Empty;
}

// ===================================================================
// Request Models
// ===================================================================

public class CreateInvoiceRequest
{
    public Guid OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public Guid ClientId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string? ClientGSTIN { get; set; }
    public string? ClientAddress { get; set; }
    public Guid? StoreId { get; set; }
    public string? StoreName { get; set; }
    public DateTime? InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }
    public string? SalesType { get; set; } // Local, Export
    public string? PONumber { get; set; }
    public DateTime? PODate { get; set; }
    public int CartonBoxes { get; set; }
    public string? Logistic { get; set; }
    public string? TransportMode { get; set; }
    public string? VehicleNo { get; set; }
    public string? PlaceOfSupply { get; set; }
    public bool IsInterState { get; set; }
    public string? SellerState { get; set; }
    public string? BuyerState { get; set; }
    public decimal DiscountAmount { get; set; }

    // Company info for print snapshot
    public string? CompanyName { get; set; }
    public string? CompanyAddress { get; set; }
    public string? CompanyGSTIN { get; set; }
    public string? CompanyPAN { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountNo { get; set; }
    public string? BankIFSC { get; set; }
    public string? BankBranch { get; set; }

    public string? Notes { get; set; }
    public List<CreateInvoiceLineRequest> Lines { get; set; } = new();
}

public class CreateInvoiceLineRequest
{
    public Guid ArticleId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? ArticleName { get; set; }
    public string? Description { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string? HSNCode { get; set; }
    public string? UOM { get; set; }

    /// <summary>
    /// Size-wise quantity breakdown, e.g. {"39":10,"40":20,"41":15,"42":20,"43":15,"44":10,"45":5,"46":5}
    /// The sum of values should equal Quantity.
    /// </summary>
    public Dictionary<string, int>? SizeBreakdown { get; set; }

    public int Quantity { get; set; }
    public decimal MRP { get; set; }
    public decimal MarginPercent { get; set; }
}

public class CreatePackingListRequest
{
    public Guid InvoiceId { get; set; }
    public Guid? WarehouseId { get; set; }
    public int TotalBoxes { get; set; }
    public decimal TotalWeight { get; set; }
    public string? Notes { get; set; }
    public List<CreatePackingListLineRequest> Lines { get; set; } = new();
}

public class CreatePackingListLineRequest
{
    public Guid ArticleId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? ArticleName { get; set; }
    public string? Description { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string? HSNCode { get; set; }
    public int Quantity { get; set; }
    public int BoxNumber { get; set; }
    public decimal Weight { get; set; }
    public Dictionary<string, int>? SizeBreakdown { get; set; }
}

public class RecordPaymentRequest
{
    public decimal Amount { get; set; }
}

public class InvoiceQueryParams : PagedQuery
{
    public string? Status { get; set; }
    public Guid? ClientId { get; set; }
    public Guid? StoreId { get; set; }
    public string? SalesType { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

public class PackingQueryParams : PagedQuery
{
    public Guid? InvoiceId { get; set; }
    public string? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

// ───────────────────────────────────────────────────────────────────
// Update request models
// ───────────────────────────────────────────────────────────────────

public class UpdateInvoiceRequest
{
    public DateTime? InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }
    public string? PONumber { get; set; }
    public DateTime? PODate { get; set; }
    public string? SalesType { get; set; }
    public int CartonBoxes { get; set; }
    public string? Logistic { get; set; }
    public string? TransportMode { get; set; }
    public string? VehicleNo { get; set; }
    public string? PlaceOfSupply { get; set; }
    public bool IsInterState { get; set; }
    public string? SellerState { get; set; }
    public string? BuyerState { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? Notes { get; set; }
    public List<CreateInvoiceLineRequest> Lines { get; set; } = new();
}

public class UpdatePackingStatusRequest
{
    public string Status { get; set; } = string.Empty; // Draft, Packed, Dispatched
}

// ───────────────────────────────────────────────────────────────────
// Report DTOs
// ───────────────────────────────────────────────────────────────────

public class GSTReportRow
{
    public string Period { get; set; } = string.Empty;       // YYYY-MM
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string SalesType { get; set; } = string.Empty;
    public decimal TaxableAmount { get; set; }
    public decimal CGSTAmount { get; set; }
    public decimal SGSTAmount { get; set; }
    public decimal IGSTAmount { get; set; }
    public decimal TotalGST { get; set; }
    public decimal TotalBillingInclGST { get; set; }
}

public class SalesReportRow
{
    public string Period { get; set; } = string.Empty;       // YYYY-MM
    public int InvoiceCount { get; set; }
    public int TotalQuantity { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TotalDiscount { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal LocalSalesAmount { get; set; }
    public decimal ExportSalesAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
}
