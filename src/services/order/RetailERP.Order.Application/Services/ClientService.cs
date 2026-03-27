using Microsoft.EntityFrameworkCore;
using RetailERP.Order.Domain.Entities;
using RetailERP.Shared.Contracts.Common;

namespace RetailERP.Order.Application.Services;

public interface IClientService
{
    Task<List<ClientDto>> GetAllClientsAsync(Guid tenantId, string? search, CancellationToken ct = default);
    Task<ClientDto> GetClientByIdAsync(Guid tenantId, Guid clientId, CancellationToken ct = default);
    Task<ClientDto> CreateClientAsync(Guid tenantId, Guid userId, CreateClientRequest request, CancellationToken ct = default);
    Task<ClientDto> UpdateClientAsync(Guid tenantId, Guid clientId, CreateClientRequest request, CancellationToken ct = default);
    Task DeleteClientAsync(Guid tenantId, Guid clientId, CancellationToken ct = default);
    Task<List<StoreDto>> GetAllStoresAsync(Guid tenantId, CancellationToken ct = default);
    Task<StoreDto> GetStoreByIdAsync(Guid tenantId, Guid storeId, CancellationToken ct = default);
    Task<List<StoreDto>> GetStoresByClientAsync(Guid tenantId, Guid clientId, CancellationToken ct = default);
    Task<StoreDto> CreateStoreAsync(Guid tenantId, Guid userId, Guid clientId, CreateStoreRequest request, CancellationToken ct = default);
    Task<StoreDto> UpdateStoreAsync(Guid tenantId, Guid storeId, CreateStoreRequest request, CancellationToken ct = default);
    Task DeleteStoreAsync(Guid tenantId, Guid storeId, CancellationToken ct = default);

    // Customer Master Entry operations
    Task<List<CustomerMasterEntryDto>> GetAllCustomerEntriesAsync(Guid tenantId, string? search, CancellationToken ct = default);
    Task<CustomerMasterEntryDto> GetCustomerEntryByIdAsync(Guid tenantId, Guid entryId, CancellationToken ct = default);
    Task<List<CustomerMasterEntryDto>> GetCustomerEntriesByStoreAsync(Guid tenantId, Guid storeId, CancellationToken ct = default);
    Task<CustomerMasterEntryDto> CreateCustomerEntryAsync(Guid tenantId, CreateCustomerMasterEntryRequest request, CancellationToken ct = default);
    Task<CustomerMasterEntryDto> UpdateCustomerEntryAsync(Guid tenantId, Guid entryId, CreateCustomerMasterEntryRequest request, CancellationToken ct = default);
    Task DeleteCustomerEntryAsync(Guid tenantId, Guid entryId, CancellationToken ct = default);
}

public class ClientService : IClientService
{
    private readonly DbContext _context;

    public ClientService(DbContext context)
    {
        _context = context;
    }

    public async Task<List<ClientDto>> GetAllClientsAsync(Guid tenantId, string? search, CancellationToken ct = default)
    {
        var query = _context.Set<Client>()
            .Where(c => c.TenantId == tenantId && c.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c => c.ClientName.Contains(search) || c.ClientCode.Contains(search));

        return await query.Select(c => new ClientDto
        {
            ClientId = c.Id,
            ClientCode = c.ClientCode,
            ClientName = c.ClientName,
            Organisation = c.Organisation,
            Email = c.Email,
            ContactNo = c.ContactNo,
            GSTIN = c.GSTIN,
            State = c.State,
            StateCode = c.StateCode,
            Zone = c.Zone,
            MarginPercent = c.MarginPercent,
            MarginType = c.MarginType,
            IsActive = c.IsActive,
            StoreCount = c.Stores.Count(s => s.IsActive)
        }).ToListAsync(ct);
    }

    public async Task<ClientDto> GetClientByIdAsync(Guid tenantId, Guid clientId, CancellationToken ct = default)
    {
        var c = await _context.Set<Client>()
            .Include(c => c.Stores.Where(s => s.IsActive))
            .FirstOrDefaultAsync(c => c.Id == clientId && c.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Client not found");

        return new ClientDto
        {
            ClientId = c.Id,
            ClientCode = c.ClientCode,
            ClientName = c.ClientName,
            Organisation = c.Organisation,
            Email = c.Email,
            ContactNo = c.ContactNo,
            GSTIN = c.GSTIN,
            PAN = c.PAN,
            State = c.State,
            StateId = c.StateId,
            StateCode = c.StateCode,
            Zone = c.Zone,
            MarginPercent = c.MarginPercent,
            MarginType = c.MarginType,
            IsActive = c.IsActive,
            StoreCount = c.Stores.Count
        };
    }

    public async Task<ClientDto> CreateClientAsync(
        Guid tenantId, Guid userId, CreateClientRequest request, CancellationToken ct = default)
    {
        var client = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ClientCode = request.ClientCode,
            ClientName = request.ClientName,
            Organisation = request.Organisation,
            Email = request.Email,
            ContactNo = request.ContactNo,
            GSTIN = request.GSTIN,
            PAN = request.PAN,
            State = request.State,
            StateId = request.StateId,
            StateCode = request.StateCode,
            Zone = request.Zone,
            MarginPercent = request.MarginPercent,
            MarginType = request.MarginType ?? "ON MRP",
            IsActive = request.IsActive,
            CreatedBy = userId
        };

        _context.Set<Client>().Add(client);
        await _context.SaveChangesAsync(ct);

        return await GetClientByIdAsync(tenantId, client.Id, ct);
    }

    public async Task<ClientDto> UpdateClientAsync(
        Guid tenantId, Guid clientId, CreateClientRequest request, CancellationToken ct = default)
    {
        var client = await _context.Set<Client>()
            .FirstOrDefaultAsync(c => c.Id == clientId && c.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Client not found");

        client.ClientCode = request.ClientCode;
        client.ClientName = request.ClientName;
        client.Organisation = request.Organisation;
        client.Email = request.Email;
        client.ContactNo = request.ContactNo;
        client.GSTIN = request.GSTIN;
        client.PAN = request.PAN;
        client.State = request.State;
        client.StateId = request.StateId;
        client.StateCode = request.StateCode;
        client.Zone = request.Zone;
        client.MarginPercent = request.MarginPercent;
        client.MarginType = request.MarginType ?? client.MarginType ?? "ON MRP";
        client.IsActive = request.IsActive;
        client.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetClientByIdAsync(tenantId, clientId, ct);
    }

    public async Task DeleteClientAsync(Guid tenantId, Guid clientId, CancellationToken ct = default)
    {
        var client = await _context.Set<Client>()
            .FirstOrDefaultAsync(c => c.Id == clientId && c.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Client not found");

        client.IsActive = false;
        client.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    public async Task<List<StoreDto>> GetAllStoresAsync(Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Set<Store>()
            .Where(s => s.TenantId == tenantId && s.IsActive)
            .Select(s => new StoreDto
            {
                StoreId = s.Id,
                ClientId = s.ClientId,
                StoreCode = s.StoreCode,
                StoreName = s.StoreName,
                Format = s.Format,
                Organisation = s.Organisation,
                City = s.City,
                State = s.State,
                Zone = s.Zone,
                StateCode = s.StateCode,
                Pincode = s.Pincode,
                Channel = s.Channel,
                ModusOperandi = s.ModusOperandi,
                MarginPercent = s.MarginPercent,
                MarginType = s.MarginType,
                ManagerName = s.ManagerName,
                ContactNo = s.ContactNo,
                Email = s.Email,
                GSTIN = s.GSTIN,
                PAN = s.PAN,
                IsActive = s.IsActive
            }).ToListAsync(ct);
    }

    public async Task<StoreDto> GetStoreByIdAsync(Guid tenantId, Guid storeId, CancellationToken ct = default)
    {
        var s = await _context.Set<Store>()
            .FirstOrDefaultAsync(s => s.Id == storeId && s.TenantId == tenantId && s.IsActive, ct)
            ?? throw new KeyNotFoundException("Store not found");

        return new StoreDto
        {
            StoreId = s.Id,
            ClientId = s.ClientId,
            StoreCode = s.StoreCode,
            StoreName = s.StoreName,
            Format = s.Format,
            Organisation = s.Organisation,
            City = s.City,
            State = s.State,
            Zone = s.Zone,
            StateCode = s.StateCode,
            Pincode = s.Pincode,
            Channel = s.Channel,
            ModusOperandi = s.ModusOperandi,
            MarginPercent = s.MarginPercent,
            MarginType = s.MarginType,
            ManagerName = s.ManagerName,
            ContactNo = s.ContactNo,
            Email = s.Email,
            GSTIN = s.GSTIN,
            PAN = s.PAN,
            IsActive = s.IsActive
        };
    }

    public async Task<List<StoreDto>> GetStoresByClientAsync(Guid tenantId, Guid clientId, CancellationToken ct = default)
    {
        return await _context.Set<Store>()
            .Where(s => s.TenantId == tenantId && s.ClientId == clientId && s.IsActive)
            .Select(s => new StoreDto
            {
                StoreId = s.Id,
                ClientId = s.ClientId,
                StoreCode = s.StoreCode,
                StoreName = s.StoreName,
                Format = s.Format,
                Organisation = s.Organisation,
                City = s.City,
                State = s.State,
                Zone = s.Zone,
                StateCode = s.StateCode,
                Pincode = s.Pincode,
                Channel = s.Channel,
                ModusOperandi = s.ModusOperandi,
                MarginPercent = s.MarginPercent,
                MarginType = s.MarginType,
                ManagerName = s.ManagerName,
                ContactNo = s.ContactNo,
                Email = s.Email,
                GSTIN = s.GSTIN,
                PAN = s.PAN,
                IsActive = s.IsActive
            }).ToListAsync(ct);
    }

    public async Task<StoreDto> CreateStoreAsync(
        Guid tenantId, Guid userId, Guid clientId, CreateStoreRequest request, CancellationToken ct = default)
    {
        var client = await _context.Set<Client>()
            .FirstOrDefaultAsync(c => c.Id == clientId && c.TenantId == tenantId && c.IsActive, ct)
            ?? throw new KeyNotFoundException("Client not found");

        var store = new Store
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ClientId = clientId,
            StoreCode = request.StoreCode,
            StoreName = request.StoreName,
            Format = request.Format,
            Organisation = request.Organisation,
            City = request.City,
            State = request.State,
            Zone = request.Zone,
            StateCode = request.StateCode,
            Pincode = request.Pincode,
            Channel = request.Channel,
            ModusOperandi = request.ModusOperandi,
            MarginPercent = request.MarginPercent,
            MarginType = request.MarginType ?? "ON MRP",
            ManagerName = request.ManagerName,
            ContactNo = request.ContactNo,
            Email = request.Email,
            GSTIN = request.GSTIN,
            PAN = request.PAN,
            IsActive = request.IsActive,
            CreatedBy = userId
        };

        _context.Set<Store>().Add(store);
        await _context.SaveChangesAsync(ct);

        return new StoreDto
        {
            StoreId = store.Id,
            ClientId = store.ClientId,
            StoreCode = store.StoreCode,
            StoreName = store.StoreName,
            Format = store.Format,
            Organisation = store.Organisation,
            City = store.City,
            State = store.State,
            Zone = store.Zone,
            StateCode = store.StateCode,
            Pincode = store.Pincode,
            Channel = store.Channel,
            ModusOperandi = store.ModusOperandi,
            MarginPercent = store.MarginPercent,
            MarginType = store.MarginType,
            ManagerName = store.ManagerName,
            ContactNo = store.ContactNo,
            Email = store.Email,
            GSTIN = store.GSTIN,
            PAN = store.PAN,
            IsActive = store.IsActive
        };
    }

    public async Task<StoreDto> UpdateStoreAsync(
        Guid tenantId, Guid storeId, CreateStoreRequest request, CancellationToken ct = default)
    {
        var store = await _context.Set<Store>()
            .FirstOrDefaultAsync(s => s.Id == storeId && s.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Store not found");

        store.StoreCode = request.StoreCode;
        store.StoreName = request.StoreName;
        store.Format = request.Format;
        store.Organisation = request.Organisation;
        store.City = request.City;
        store.State = request.State;
        store.Zone = request.Zone;
        store.StateCode = request.StateCode;
        store.Pincode = request.Pincode;
        store.Channel = request.Channel;
        store.ModusOperandi = request.ModusOperandi;
        store.MarginPercent = request.MarginPercent;
        store.MarginType = request.MarginType ?? store.MarginType ?? "ON MRP";
        store.IsActive = request.IsActive;
        store.ManagerName = request.ManagerName;
        store.ContactNo = request.ContactNo;
        store.Email = request.Email;
        store.GSTIN = request.GSTIN;
        store.PAN = request.PAN;
        store.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        return new StoreDto
        {
            StoreId = store.Id,
            ClientId = store.ClientId,
            StoreCode = store.StoreCode,
            StoreName = store.StoreName,
            Format = store.Format,
            Organisation = store.Organisation,
            City = store.City,
            State = store.State,
            Zone = store.Zone,
            StateCode = store.StateCode,
            Pincode = store.Pincode,
            Channel = store.Channel,
            ModusOperandi = store.ModusOperandi,
            MarginPercent = store.MarginPercent,
            MarginType = store.MarginType,
            ManagerName = store.ManagerName,
            ContactNo = store.ContactNo,
            Email = store.Email,
            GSTIN = store.GSTIN,
            PAN = store.PAN,
            IsActive = store.IsActive
        };
    }

    public async Task DeleteStoreAsync(Guid tenantId, Guid storeId, CancellationToken ct = default)
    {
        var store = await _context.Set<Store>()
            .FirstOrDefaultAsync(s => s.Id == storeId && s.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Store not found");

        store.IsActive = false;
        store.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    // ── Customer Master Entry CRUD ──

    public async Task<List<CustomerMasterEntryDto>> GetAllCustomerEntriesAsync(Guid tenantId, string? search, CancellationToken ct = default)
    {
        var query = _context.Set<CustomerMasterEntry>()
            .Include(e => e.Store)
            .Include(e => e.Client)
            .Where(e => e.TenantId == tenantId && e.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(e =>
                (e.Store.StoreName.Contains(term)) ||
                (e.StoreCode != null && e.StoreCode.Contains(term)) ||
                (e.BillingCity != null && e.BillingCity.Contains(term)) ||
                (e.ContactName != null && e.ContactName.Contains(term)));
        }

        return await query.Select(e => MapToDto(e)).ToListAsync(ct);
    }

    public async Task<CustomerMasterEntryDto> GetCustomerEntryByIdAsync(Guid tenantId, Guid entryId, CancellationToken ct = default)
    {
        var e = await _context.Set<CustomerMasterEntry>()
            .Include(x => x.Store)
            .Include(x => x.Client)
            .FirstOrDefaultAsync(x => x.CustomerEntryId == entryId && x.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Customer master entry not found");

        return MapToDto(e);
    }

    public async Task<List<CustomerMasterEntryDto>> GetCustomerEntriesByStoreAsync(Guid tenantId, Guid storeId, CancellationToken ct = default)
    {
        return await _context.Set<CustomerMasterEntry>()
            .Include(e => e.Store)
            .Include(e => e.Client)
            .Where(e => e.TenantId == tenantId && e.StoreId == storeId && e.IsActive)
            .Select(e => MapToDto(e))
            .ToListAsync(ct);
    }

    public async Task<CustomerMasterEntryDto> CreateCustomerEntryAsync(
        Guid tenantId, CreateCustomerMasterEntryRequest req, CancellationToken ct = default)
    {
        // Validate store exists
        var store = await _context.Set<Store>()
            .FirstOrDefaultAsync(s => s.Id == req.StoreId && s.TenantId == tenantId && s.IsActive, ct)
            ?? throw new KeyNotFoundException("Store not found");

        var entry = new CustomerMasterEntry
        {
            CustomerEntryId = Guid.NewGuid(),
            TenantId = tenantId,
            StoreId = req.StoreId,
            ClientId = req.ClientId,
            EntryDate = req.EntryDate,
            StoreCode = req.StoreCode,
            Organisation = req.Organisation,
            BillingAddress1 = req.BillingAddress1,
            BillingAddress2 = req.BillingAddress2,
            BillingAddress3 = req.BillingAddress3,
            BillingAddress4 = req.BillingAddress4,
            BillingAddress5 = req.BillingAddress5,
            BillingPinCode = req.BillingPinCode,
            BillingCity = req.BillingCity,
            BillingNumber = req.BillingNumber,
            BillingState = req.BillingState,
            BillingStateCode = req.BillingStateCode,
            BillingZone = req.BillingZone,
            SameAsBilling = req.SameAsBilling,
            ShippingAddress1 = req.SameAsBilling ? req.BillingAddress1 : req.ShippingAddress1,
            ShippingAddress2 = req.SameAsBilling ? req.BillingAddress2 : req.ShippingAddress2,
            ShippingAddress3 = req.SameAsBilling ? req.BillingAddress3 : req.ShippingAddress3,
            ShippingPinCode = req.SameAsBilling ? req.BillingPinCode : req.ShippingPinCode,
            ShippingCity = req.SameAsBilling ? req.BillingCity : req.ShippingCity,
            ShippingNumber = req.SameAsBilling ? req.BillingNumber : req.ShippingNumber,
            ShippingState = req.SameAsBilling ? req.BillingState : req.ShippingState,
            ShippingStateCode = req.SameAsBilling ? req.BillingStateCode : req.ShippingStateCode,
            ShippingZone = req.SameAsBilling ? req.BillingZone : req.ShippingZone,
            ContactName = req.ContactName,
            ContactNo = req.ContactNo,
            Email = req.Email,
            StoreManager = req.StoreManager,
            ManagerContact = req.ManagerContact,
            AreaManager = req.AreaManager,
            AreaContact = req.AreaContact,
            BuyerDesign = req.BuyerDesign,
            GSTIN = req.GSTIN,
            GSTStateCode = req.GSTStateCode,
            PAN = req.PAN,
            FSSAI = req.FSSAI,
            BusinessChannel = req.BusinessChannel,
            BusinessModule = req.BusinessModule,
            MarginPercent = req.MarginPercent,
            MarginType = req.MarginType ?? "ON MRP",
            IsActive = req.IsActive,
        };

        _context.Set<CustomerMasterEntry>().Add(entry);
        await _context.SaveChangesAsync(ct);

        return await GetCustomerEntryByIdAsync(tenantId, entry.CustomerEntryId, ct);
    }

    public async Task<CustomerMasterEntryDto> UpdateCustomerEntryAsync(
        Guid tenantId, Guid entryId, CreateCustomerMasterEntryRequest req, CancellationToken ct = default)
    {
        var entry = await _context.Set<CustomerMasterEntry>()
            .FirstOrDefaultAsync(e => e.CustomerEntryId == entryId && e.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Customer master entry not found");

        entry.StoreId = req.StoreId;
        entry.ClientId = req.ClientId;
        entry.EntryDate = req.EntryDate;
        entry.StoreCode = req.StoreCode;
        entry.Organisation = req.Organisation;
        entry.BillingAddress1 = req.BillingAddress1;
        entry.BillingAddress2 = req.BillingAddress2;
        entry.BillingAddress3 = req.BillingAddress3;
        entry.BillingAddress4 = req.BillingAddress4;
        entry.BillingAddress5 = req.BillingAddress5;
        entry.BillingPinCode = req.BillingPinCode;
        entry.BillingCity = req.BillingCity;
        entry.BillingNumber = req.BillingNumber;
        entry.BillingState = req.BillingState;
        entry.BillingStateCode = req.BillingStateCode;
        entry.BillingZone = req.BillingZone;
        entry.SameAsBilling = req.SameAsBilling;
        entry.ShippingAddress1 = req.SameAsBilling ? req.BillingAddress1 : req.ShippingAddress1;
        entry.ShippingAddress2 = req.SameAsBilling ? req.BillingAddress2 : req.ShippingAddress2;
        entry.ShippingAddress3 = req.SameAsBilling ? req.BillingAddress3 : req.ShippingAddress3;
        entry.ShippingPinCode = req.SameAsBilling ? req.BillingPinCode : req.ShippingPinCode;
        entry.ShippingCity = req.SameAsBilling ? req.BillingCity : req.ShippingCity;
        entry.ShippingNumber = req.SameAsBilling ? req.BillingNumber : req.ShippingNumber;
        entry.ShippingState = req.SameAsBilling ? req.BillingState : req.ShippingState;
        entry.ShippingStateCode = req.SameAsBilling ? req.BillingStateCode : req.ShippingStateCode;
        entry.ShippingZone = req.SameAsBilling ? req.BillingZone : req.ShippingZone;
        entry.ContactName = req.ContactName;
        entry.ContactNo = req.ContactNo;
        entry.Email = req.Email;
        entry.StoreManager = req.StoreManager;
        entry.ManagerContact = req.ManagerContact;
        entry.AreaManager = req.AreaManager;
        entry.AreaContact = req.AreaContact;
        entry.BuyerDesign = req.BuyerDesign;
        entry.GSTIN = req.GSTIN;
        entry.GSTStateCode = req.GSTStateCode;
        entry.PAN = req.PAN;
        entry.FSSAI = req.FSSAI;
        entry.BusinessChannel = req.BusinessChannel;
        entry.BusinessModule = req.BusinessModule;
        entry.MarginPercent = req.MarginPercent;
        entry.MarginType = req.MarginType ?? entry.MarginType;
        entry.IsActive = req.IsActive;
        entry.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetCustomerEntryByIdAsync(tenantId, entryId, ct);
    }

    public async Task DeleteCustomerEntryAsync(Guid tenantId, Guid entryId, CancellationToken ct = default)
    {
        var entry = await _context.Set<CustomerMasterEntry>()
            .FirstOrDefaultAsync(e => e.CustomerEntryId == entryId && e.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException("Customer master entry not found");

        entry.IsActive = false;
        entry.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    private static CustomerMasterEntryDto MapToDto(CustomerMasterEntry e) => new()
    {
        CustomerEntryId = e.CustomerEntryId,
        StoreId = e.StoreId,
        ClientId = e.ClientId,
        ClientName = e.Client?.ClientName,
        StoreName = e.Store?.StoreName,
        EntryDate = e.EntryDate,
        StoreCode = e.StoreCode,
        Organisation = e.Organisation,
        BillingAddress1 = e.BillingAddress1,
        BillingAddress2 = e.BillingAddress2,
        BillingAddress3 = e.BillingAddress3,
        BillingAddress4 = e.BillingAddress4,
        BillingAddress5 = e.BillingAddress5,
        BillingPinCode = e.BillingPinCode,
        BillingCity = e.BillingCity,
        BillingNumber = e.BillingNumber,
        BillingState = e.BillingState,
        BillingStateCode = e.BillingStateCode,
        BillingZone = e.BillingZone,
        SameAsBilling = e.SameAsBilling,
        ShippingAddress1 = e.ShippingAddress1,
        ShippingAddress2 = e.ShippingAddress2,
        ShippingAddress3 = e.ShippingAddress3,
        ShippingPinCode = e.ShippingPinCode,
        ShippingCity = e.ShippingCity,
        ShippingNumber = e.ShippingNumber,
        ShippingState = e.ShippingState,
        ShippingStateCode = e.ShippingStateCode,
        ShippingZone = e.ShippingZone,
        ContactName = e.ContactName,
        ContactNo = e.ContactNo,
        Email = e.Email,
        StoreManager = e.StoreManager,
        ManagerContact = e.ManagerContact,
        AreaManager = e.AreaManager,
        AreaContact = e.AreaContact,
        BuyerDesign = e.BuyerDesign,
        GSTIN = e.GSTIN,
        GSTStateCode = e.GSTStateCode,
        PAN = e.PAN,
        FSSAI = e.FSSAI,
        BusinessChannel = e.BusinessChannel,
        BusinessModule = e.BusinessModule,
        MarginPercent = e.MarginPercent,
        MarginType = e.MarginType,
        IsActive = e.IsActive,
    };
}

// DTOs
public class ClientDto
{
    public Guid ClientId { get; set; }
    public string ClientCode { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string? Organisation { get; set; }
    public string? Email { get; set; }
    public string? ContactNo { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
    public string? State { get; set; }
    public int? StateId { get; set; }
    public string? StateCode { get; set; }
    public string? Zone { get; set; }
    public decimal MarginPercent { get; set; }
    public string? MarginType { get; set; }
    public bool IsActive { get; set; }
    public int StoreCount { get; set; }
}

public class StoreDto
{
    public Guid StoreId { get; set; }
    public Guid ClientId { get; set; }
    public string StoreCode { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
    public string? Format { get; set; }
    public string? Organisation { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Zone { get; set; }
    public string? StateCode { get; set; }
    public string? Pincode { get; set; }
    public string? Channel { get; set; }
    public string? ModusOperandi { get; set; }
    public decimal MarginPercent { get; set; }
    public string? MarginType { get; set; }
    public string? ManagerName { get; set; }
    public string? ContactNo { get; set; }
    public string? Email { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
    public bool IsActive { get; set; }
}

public class CreateClientRequest
{
    public string ClientCode { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string? Organisation { get; set; }
    public string? Email { get; set; }
    public string? ContactNo { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
    public string? State { get; set; }
    public int? StateId { get; set; }
    public string? StateCode { get; set; }
    public string? Zone { get; set; }
    public decimal MarginPercent { get; set; }
    public string? MarginType { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CreateStoreRequest
{
    public string StoreCode { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
    public string? Format { get; set; }
    public string? Organisation { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Zone { get; set; }
    public string? StateCode { get; set; }
    public string? Pincode { get; set; }
    public string? Channel { get; set; }
    public string? ModusOperandi { get; set; }
    public decimal MarginPercent { get; set; }
    public string? MarginType { get; set; }
    public string? ManagerName { get; set; }
    public string? ContactNo { get; set; }
    public string? Email { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
    public bool IsActive { get; set; } = true;
}

// ── Customer Master Entry DTOs ──

public class CustomerMasterEntryDto
{
    public Guid CustomerEntryId { get; set; }
    public Guid StoreId { get; set; }
    public Guid ClientId { get; set; }
    public string? ClientName { get; set; }
    public string? StoreName { get; set; }
    public DateTime EntryDate { get; set; }
    public string? StoreCode { get; set; }
    public string? Organisation { get; set; }
    // Billing
    public string? BillingAddress1 { get; set; }
    public string? BillingAddress2 { get; set; }
    public string? BillingAddress3 { get; set; }
    public string? BillingAddress4 { get; set; }
    public string? BillingAddress5 { get; set; }
    public string? BillingPinCode { get; set; }
    public string? BillingCity { get; set; }
    public string? BillingNumber { get; set; }
    public string? BillingState { get; set; }
    public string? BillingStateCode { get; set; }
    public string? BillingZone { get; set; }
    // Shipping
    public bool SameAsBilling { get; set; }
    public string? ShippingAddress1 { get; set; }
    public string? ShippingAddress2 { get; set; }
    public string? ShippingAddress3 { get; set; }
    public string? ShippingPinCode { get; set; }
    public string? ShippingCity { get; set; }
    public string? ShippingNumber { get; set; }
    public string? ShippingState { get; set; }
    public string? ShippingStateCode { get; set; }
    public string? ShippingZone { get; set; }
    // Contact & Tax
    public string? ContactName { get; set; }
    public string? ContactNo { get; set; }
    public string? Email { get; set; }
    public string? StoreManager { get; set; }
    public string? ManagerContact { get; set; }
    public string? AreaManager { get; set; }
    public string? AreaContact { get; set; }
    public string? BuyerDesign { get; set; }
    public string? GSTIN { get; set; }
    public string? GSTStateCode { get; set; }
    public string? PAN { get; set; }
    public string? FSSAI { get; set; }
    // Business Config
    public string? BusinessChannel { get; set; }
    public string? BusinessModule { get; set; }
    public decimal MarginPercent { get; set; }
    public string? MarginType { get; set; }
    public bool IsActive { get; set; }
}

public class CreateCustomerMasterEntryRequest
{
    public Guid StoreId { get; set; }
    public Guid ClientId { get; set; }
    public DateTime EntryDate { get; set; }
    public string? StoreCode { get; set; }
    public string? Organisation { get; set; }
    // Billing
    public string? BillingAddress1 { get; set; }
    public string? BillingAddress2 { get; set; }
    public string? BillingAddress3 { get; set; }
    public string? BillingAddress4 { get; set; }
    public string? BillingAddress5 { get; set; }
    public string? BillingPinCode { get; set; }
    public string? BillingCity { get; set; }
    public string? BillingNumber { get; set; }
    public string? BillingState { get; set; }
    public string? BillingStateCode { get; set; }
    public string? BillingZone { get; set; }
    // Shipping
    public bool SameAsBilling { get; set; }
    public string? ShippingAddress1 { get; set; }
    public string? ShippingAddress2 { get; set; }
    public string? ShippingAddress3 { get; set; }
    public string? ShippingPinCode { get; set; }
    public string? ShippingCity { get; set; }
    public string? ShippingNumber { get; set; }
    public string? ShippingState { get; set; }
    public string? ShippingStateCode { get; set; }
    public string? ShippingZone { get; set; }
    // Contact & Tax
    public string? ContactName { get; set; }
    public string? ContactNo { get; set; }
    public string? Email { get; set; }
    public string? StoreManager { get; set; }
    public string? ManagerContact { get; set; }
    public string? AreaManager { get; set; }
    public string? AreaContact { get; set; }
    public string? BuyerDesign { get; set; }
    public string? GSTIN { get; set; }
    public string? GSTStateCode { get; set; }
    public string? PAN { get; set; }
    public string? FSSAI { get; set; }
    // Business Config
    public string? BusinessChannel { get; set; }
    public string? BusinessModule { get; set; }
    public decimal MarginPercent { get; set; }
    public string? MarginType { get; set; }
    public bool IsActive { get; set; } = true;
}
