using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailERP.Billing.Application.Interfaces;
using RetailERP.Billing.Application.Services;
using RetailERP.Billing.Application.Utilities;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Billing.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly IBillingService _billingService;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public InvoicesController(IBillingService billingService)
    {
        _billingService = billingService;
    }

    /// <summary>
    /// List invoices with filtering, sorting and pagination.
    /// Filters: dateFrom, dateTo, clientId, storeId, salesType, status.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<InvoiceListDto>>>> GetAll(
        [FromQuery] InvoiceQueryParams query, CancellationToken ct)
    {
        var result = await _billingService.GetInvoicesAsync(TenantId, query, ct);
        return Ok(ApiResponse<PagedResult<InvoiceListDto>>.Ok(result));
    }

    /// <summary>
    /// Get a single invoice with all line items and EL CURIO calculations.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _billingService.GetInvoiceAsync(TenantId, id, ct);
        return Ok(ApiResponse<InvoiceDto>.Ok(result));
    }

    /// <summary>
    /// Create a new invoice. Line items are auto-calculated using the EL CURIO margin formula.
    /// Accepts full header (invoiceDate, clientId, storeId, salesType, poNumber, poDate,
    /// cartonBoxes, logistic, transportMode, vehicleNo, placeOfSupply, isInterState)
    /// plus line items (articleId, hsnCode, description, colour, uom, sizeBreakdown, qty, mrp, marginPercent).
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> Create(
        [FromBody] CreateInvoiceRequest request, CancellationToken ct)
    {
        var result = await _billingService.CreateInvoiceAsync(TenantId, UserId, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.InvoiceId }, ApiResponse<InvoiceDto>.Ok(result));
    }

    /// <summary>
    /// Update a Draft invoice — replaces header fields and recalculates all line items.
    /// Only allowed when Status = Draft.
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> Update(
        Guid id, [FromBody] UpdateInvoiceRequest request, CancellationToken ct)
    {
        var result = await _billingService.UpdateInvoiceAsync(TenantId, id, request, ct);
        return Ok(ApiResponse<InvoiceDto>.Ok(result, "Invoice updated"));
    }

    /// <summary>
    /// Soft-delete an invoice (marks IsActive=false, Status=Cancelled).
    /// Cannot delete Paid invoices.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken ct)
    {
        await _billingService.DeleteInvoiceAsync(TenantId, id, ct);
        return Ok(ApiResponse<object>.Ok(null, "Invoice deleted"));
    }

    /// <summary>
    /// Issue a draft invoice (transitions status from Draft to Issued).
    /// </summary>
    [HttpPost("{id:guid}/issue")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> Issue(Guid id, CancellationToken ct)
    {
        var result = await _billingService.IssueInvoiceAsync(TenantId, id, ct);
        return Ok(ApiResponse<InvoiceDto>.Ok(result, "Invoice issued"));
    }

    /// <summary>
    /// Cancel an invoice. Cannot cancel Paid or already Cancelled invoices.
    /// </summary>
    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _billingService.CancelInvoiceAsync(TenantId, id, ct);
        return Ok(ApiResponse<InvoiceDto>.Ok(result, "Invoice cancelled"));
    }

    /// <summary>
    /// Record a payment against an issued invoice.
    /// </summary>
    [HttpPost("{id:guid}/payment")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> RecordPayment(
        Guid id, [FromBody] RecordPaymentRequest request, CancellationToken ct)
    {
        var result = await _billingService.RecordPaymentAsync(TenantId, id, request.Amount, ct);
        return Ok(ApiResponse<InvoiceDto>.Ok(result, "Payment recorded"));
    }

    /// <summary>
    /// Get print-ready invoice data including company info, bank details,
    /// and total amount in Indian words.
    /// </summary>
    [HttpGet("{id:guid}/print")]
    public async Task<ActionResult<ApiResponse<InvoicePrintDto>>> GetPrintData(Guid id, CancellationToken ct)
    {
        var result = await _billingService.GetInvoicePrintDataAsync(TenantId, id, ct);
        return Ok(ApiResponse<InvoicePrintDto>.Ok(result));
    }

    /// <summary>
    /// Get delivery note data for an invoice, including packing lists and line items.
    /// </summary>
    [HttpGet("{id:guid}/delivery")]
    public async Task<ActionResult<ApiResponse<DeliveryNoteDataDto>>> GetDeliveryData(Guid id, CancellationToken ct)
    {
        var result = await _billingService.GetDeliveryNoteDataAsync(TenantId, id, ct);
        return Ok(ApiResponse<DeliveryNoteDataDto>.Ok(result));
    }

    /// <summary>
    /// Get all packing lists associated with an invoice.
    /// </summary>
    [HttpGet("{id:guid}/packing-lists")]
    public async Task<ActionResult<ApiResponse<List<PackingListDto>>>> GetPackingLists(Guid id, CancellationToken ct)
    {
        var result = await _billingService.GetPackingListsByInvoiceAsync(TenantId, id, ct);
        return Ok(ApiResponse<List<PackingListDto>>.Ok(result));
    }

    /// <summary>
    /// Calculate EL CURIO margin for a single line item (preview, does not persist).
    /// Useful for the frontend to show calculations before the user submits.
    /// </summary>
    [HttpPost("calculate")]
    public ActionResult<ApiResponse<ElCurioLineResult>> Calculate(
        [FromBody] CalculateLineRequest request)
    {
        var result = _billingService.CalculateElCurioLineItem(request.MRP, request.MarginPercent, request.Quantity);
        return Ok(ApiResponse<ElCurioLineResult>.Ok(result));
    }

    /// <summary>
    /// GST Summary Report — one row per invoice in the date range.
    /// Returns taxable amount, CGST, SGST, IGST breakdowns.
    /// Query params: fromDate (YYYY-MM-DD), toDate (YYYY-MM-DD)
    /// </summary>
    [HttpGet("reports/gst")]
    public async Task<ActionResult<ApiResponse<List<GSTReportRow>>>> GSTReport(
        [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate, CancellationToken ct)
    {
        var result = await _billingService.GetGSTReportAsync(TenantId, fromDate, toDate, ct);
        return Ok(ApiResponse<List<GSTReportRow>>.Ok(result));
    }

    /// <summary>
    /// Sales Summary Report — aggregated by month.
    /// Returns invoice count, quantity, revenue, local vs export split, paid/balance.
    /// Query params: fromDate (YYYY-MM-DD), toDate (YYYY-MM-DD)
    /// </summary>
    [HttpGet("reports/sales")]
    public async Task<ActionResult<ApiResponse<List<SalesReportRow>>>> SalesReport(
        [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate, CancellationToken ct)
    {
        var result = await _billingService.GetSalesReportAsync(TenantId, fromDate, toDate, ct);
        return Ok(ApiResponse<List<SalesReportRow>>.Ok(result));
    }
}

/// <summary>
/// Request for the preview calculation endpoint.
/// </summary>
public class CalculateLineRequest
{
    public decimal MRP { get; set; }
    public decimal MarginPercent { get; set; }
    public int Quantity { get; set; }
}
