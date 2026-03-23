using RetailERP.Billing.Application.Services;
using RetailERP.Billing.Application.Utilities;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Billing.Application.Interfaces;

public interface IBillingService
{
    // Invoice operations
    Task<InvoiceDto> CreateInvoiceAsync(Guid tenantId, Guid userId, CreateInvoiceRequest request, CancellationToken ct = default);
    Task<InvoiceDto> GetInvoiceAsync(Guid tenantId, Guid invoiceId, CancellationToken ct = default);
    Task<PagedResult<InvoiceListDto>> GetInvoicesAsync(Guid tenantId, InvoiceQueryParams query, CancellationToken ct = default);
    Task<InvoiceDto> UpdateInvoiceAsync(Guid tenantId, Guid invoiceId, UpdateInvoiceRequest request, CancellationToken ct = default);
    Task DeleteInvoiceAsync(Guid tenantId, Guid invoiceId, CancellationToken ct = default);
    Task<InvoiceDto> IssueInvoiceAsync(Guid tenantId, Guid invoiceId, CancellationToken ct = default);
    Task<InvoiceDto> CancelInvoiceAsync(Guid tenantId, Guid invoiceId, CancellationToken ct = default);
    Task<InvoiceDto> RecordPaymentAsync(Guid tenantId, Guid invoiceId, decimal amount, CancellationToken ct = default);
    Task<InvoicePrintDto> GetInvoicePrintDataAsync(Guid tenantId, Guid invoiceId, CancellationToken ct = default);
    Task<DeliveryNoteDataDto> GetDeliveryNoteDataAsync(Guid tenantId, Guid invoiceId, CancellationToken ct = default);

    // EL CURIO margin calculation (exposed for testing / direct use)
    ElCurioLineResult CalculateElCurioLineItem(decimal mrp, decimal marginPercent, int quantity);

    // Packing operations
    Task<PackingListDto> CreatePackingListAsync(Guid tenantId, Guid userId, CreatePackingListRequest request, CancellationToken ct = default);
    Task<PackingListDto> GetPackingListAsync(Guid tenantId, Guid packingListId, CancellationToken ct = default);
    Task<List<PackingListDto>> GetPackingListsByInvoiceAsync(Guid tenantId, Guid invoiceId, CancellationToken ct = default);
    Task<PagedResult<PackingListSummaryDto>> GetPackingListsPagedAsync(Guid tenantId, PackingQueryParams query, CancellationToken ct = default);
    Task<PackingListDto> UpdatePackingStatusAsync(Guid tenantId, Guid packingListId, string status, CancellationToken ct = default);
    Task DeletePackingListAsync(Guid tenantId, Guid packingListId, CancellationToken ct = default);

    // Reports
    Task<List<GSTReportRow>> GetGSTReportAsync(Guid tenantId, DateTime fromDate, DateTime toDate, CancellationToken ct = default);
    Task<List<SalesReportRow>> GetSalesReportAsync(Guid tenantId, DateTime fromDate, DateTime toDate, CancellationToken ct = default);
}
