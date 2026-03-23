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
            StateCode = c.StateCode,
            Zone = c.Zone,
            MarginPercent = c.MarginPercent,
            MarginType = c.MarginType,
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
            StateId = c.StateId,
            StateCode = c.StateCode,
            Zone = c.Zone,
            MarginPercent = c.MarginPercent,
            MarginType = c.MarginType,
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
            StateId = request.StateId,
            StateCode = request.StateCode,
            Zone = request.Zone,
            MarginPercent = request.MarginPercent,
            MarginType = request.MarginType,
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
        client.StateId = request.StateId;
        client.StateCode = request.StateCode;
        client.Zone = request.Zone;
        client.MarginPercent = request.MarginPercent;
        client.MarginType = request.MarginType;
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
                Channel = s.Channel,
                ModusOperandi = s.ModusOperandi,
                MarginPercent = s.MarginPercent,
                MarginType = s.MarginType,
                ManagerName = s.ManagerName,
                Email = s.Email,
                GSTIN = s.GSTIN,
                PAN = s.PAN
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
            Channel = s.Channel,
            ModusOperandi = s.ModusOperandi,
            MarginPercent = s.MarginPercent,
            MarginType = s.MarginType,
            ManagerName = s.ManagerName,
            Email = s.Email,
            GSTIN = s.GSTIN,
            PAN = s.PAN
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
                Channel = s.Channel,
                ModusOperandi = s.ModusOperandi,
                MarginPercent = s.MarginPercent,
                MarginType = s.MarginType,
                ManagerName = s.ManagerName,
                Email = s.Email,
                GSTIN = s.GSTIN,
                PAN = s.PAN
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
            Channel = request.Channel,
            ModusOperandi = request.ModusOperandi,
            MarginPercent = request.MarginPercent,
            MarginType = request.MarginType,
            ManagerName = request.ManagerName,
            Email = request.Email,
            GSTIN = request.GSTIN,
            PAN = request.PAN,
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
            Channel = store.Channel,
            ModusOperandi = store.ModusOperandi,
            MarginPercent = store.MarginPercent,
            MarginType = store.MarginType,
            ManagerName = store.ManagerName,
            Email = store.Email,
            GSTIN = store.GSTIN,
            PAN = store.PAN
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
        store.Channel = request.Channel;
        store.ModusOperandi = request.ModusOperandi;
        store.MarginPercent = request.MarginPercent;
        store.MarginType = request.MarginType;
        store.ManagerName = request.ManagerName;
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
            Channel = store.Channel,
            ModusOperandi = store.ModusOperandi,
            MarginPercent = store.MarginPercent,
            MarginType = store.MarginType,
            ManagerName = store.ManagerName,
            Email = store.Email,
            GSTIN = store.GSTIN,
            PAN = store.PAN
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
    public Guid? StateId { get; set; }
    public string? StateCode { get; set; }
    public string? Zone { get; set; }
    public decimal MarginPercent { get; set; }
    public string? MarginType { get; set; }
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
    public string? Channel { get; set; }
    public string? ModusOperandi { get; set; }
    public decimal MarginPercent { get; set; }
    public string? MarginType { get; set; }
    public string? ManagerName { get; set; }
    public string? Email { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
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
    public Guid? StateId { get; set; }
    public string? StateCode { get; set; }
    public string? Zone { get; set; }
    public decimal MarginPercent { get; set; }
    public string? MarginType { get; set; }
}

public class CreateStoreRequest
{
    public string StoreCode { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
    public string? Format { get; set; }
    public string? Organisation { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Channel { get; set; }
    public string? ModusOperandi { get; set; }
    public decimal MarginPercent { get; set; }
    public string? MarginType { get; set; }
    public string? ManagerName { get; set; }
    public string? Email { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
}
