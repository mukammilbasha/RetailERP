using Microsoft.EntityFrameworkCore;
using RetailERP.Product.Application.Interfaces;
using RetailERP.Product.Domain.Entities;
using RetailERP.Shared.Contracts.Product;

namespace RetailERP.Product.Application.Services;

public class MasterDataService : IMasterDataService
{
    private readonly DbContext _context;

    public MasterDataService(DbContext context)
    {
        _context = context;
    }

    // ── Brands ───────────────────────────────────────────────────────────────

    public async Task<List<MasterDataDto>> GetBrandsAsync(Guid tenantId, string? search = null, CancellationToken ct = default)
    {
        var query = _context.Set<Brand>().Where(b => b.TenantId == tenantId && b.IsActive);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(b => b.Name.ToLower().Contains(search.ToLower()));

        return await query.OrderBy(b => b.Name)
            .Select(b => new MasterDataDto(b.Id, b.Name, b.IsActive))
            .ToListAsync(ct);
    }

    public async Task<MasterDataDto> GetBrandByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var brand = await _context.Set<Brand>()
            .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Brand with ID {id} not found");
        return new MasterDataDto(brand.Id, brand.Name, brand.IsActive);
    }

    public async Task<MasterDataDto> CreateBrandAsync(Guid tenantId, CreateMasterDataRequest request, Guid createdBy, CancellationToken ct = default)
    {
        var exists = await _context.Set<Brand>().AnyAsync(b => b.TenantId == tenantId && b.Name == request.Name && b.IsActive, ct);
        if (exists) throw new ArgumentException($"Brand '{request.Name}' already exists");

        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name,
            IsActive = request.IsActive,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };
        _context.Set<Brand>().Add(brand);
        await _context.SaveChangesAsync(ct);
        return new MasterDataDto(brand.Id, brand.Name, brand.IsActive);
    }

    public async Task<MasterDataDto> UpdateBrandAsync(Guid id, Guid tenantId, CreateMasterDataRequest request, CancellationToken ct = default)
    {
        var brand = await _context.Set<Brand>()
            .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Brand with ID {id} not found");

        brand.Name = request.Name;
        brand.IsActive = request.IsActive;
        brand.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return new MasterDataDto(brand.Id, brand.Name, brand.IsActive);
    }

    public async Task DeleteBrandAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var brand = await _context.Set<Brand>()
            .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Brand with ID {id} not found");

        brand.IsActive = false;
        brand.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    // ── Genders ──────────────────────────────────────────────────────────────

    public async Task<List<MasterDataDto>> GetGendersAsync(Guid tenantId, string? search = null, CancellationToken ct = default)
    {
        var query = _context.Set<Gender>().Where(g => g.TenantId == tenantId && g.IsActive);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(g => g.Name.ToLower().Contains(search.ToLower()));

        return await query.OrderBy(g => g.Name)
            .Select(g => new MasterDataDto(g.Id, g.Name, g.IsActive))
            .ToListAsync(ct);
    }

    public async Task<MasterDataDto> GetGenderByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var gender = await _context.Set<Gender>()
            .FirstOrDefaultAsync(g => g.Id == id && g.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Gender with ID {id} not found");
        return new MasterDataDto(gender.Id, gender.Name, gender.IsActive);
    }

    public async Task<MasterDataDto> CreateGenderAsync(Guid tenantId, CreateMasterDataRequest request, Guid createdBy, CancellationToken ct = default)
    {
        var exists = await _context.Set<Gender>().AnyAsync(g => g.TenantId == tenantId && g.Name == request.Name && g.IsActive, ct);
        if (exists) throw new ArgumentException($"Gender '{request.Name}' already exists");

        var gender = new Gender
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name,
            IsActive = request.IsActive,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };
        _context.Set<Gender>().Add(gender);
        await _context.SaveChangesAsync(ct);
        return new MasterDataDto(gender.Id, gender.Name, gender.IsActive);
    }

    public async Task<MasterDataDto> UpdateGenderAsync(Guid id, Guid tenantId, CreateMasterDataRequest request, CancellationToken ct = default)
    {
        var gender = await _context.Set<Gender>()
            .FirstOrDefaultAsync(g => g.Id == id && g.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Gender with ID {id} not found");

        gender.Name = request.Name;
        gender.IsActive = request.IsActive;
        gender.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return new MasterDataDto(gender.Id, gender.Name, gender.IsActive);
    }

    public async Task DeleteGenderAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var gender = await _context.Set<Gender>()
            .FirstOrDefaultAsync(g => g.Id == id && g.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Gender with ID {id} not found");

        gender.IsActive = false;
        gender.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    // ── Seasons ──────────────────────────────────────────────────────────────

    public async Task<List<SeasonDto>> GetSeasonsAsync(Guid tenantId, string? search = null, CancellationToken ct = default)
    {
        var query = _context.Set<Season>().Where(s => s.TenantId == tenantId && s.IsActive);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.SeasonCode.ToLower().Contains(search.ToLower()));

        return await query.OrderByDescending(s => s.StartDate)
            .Select(s => new SeasonDto(s.Id, s.SeasonCode, s.StartDate, s.EndDate, s.IsActive))
            .ToListAsync(ct);
    }

    public async Task<SeasonDto> GetSeasonByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var season = await _context.Set<Season>()
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Season with ID {id} not found");
        return new SeasonDto(season.Id, season.SeasonCode, season.StartDate, season.EndDate, season.IsActive);
    }

    public async Task<SeasonDto> CreateSeasonAsync(Guid tenantId, CreateSeasonRequest request, Guid createdBy, CancellationToken ct = default)
    {
        var exists = await _context.Set<Season>().AnyAsync(s => s.TenantId == tenantId && s.SeasonCode == request.SeasonCode && s.IsActive, ct);
        if (exists) throw new ArgumentException($"Season '{request.SeasonCode}' already exists");

        var season = new Season
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SeasonCode = request.SeasonCode,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };
        _context.Set<Season>().Add(season);
        await _context.SaveChangesAsync(ct);
        return new SeasonDto(season.Id, season.SeasonCode, season.StartDate, season.EndDate, season.IsActive);
    }

    public async Task<SeasonDto> UpdateSeasonAsync(Guid id, Guid tenantId, CreateSeasonRequest request, CancellationToken ct = default)
    {
        var season = await _context.Set<Season>()
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Season with ID {id} not found");

        season.SeasonCode = request.SeasonCode;
        season.StartDate = request.StartDate;
        season.EndDate = request.EndDate;
        season.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return new SeasonDto(season.Id, season.SeasonCode, season.StartDate, season.EndDate, season.IsActive);
    }

    public async Task DeleteSeasonAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var season = await _context.Set<Season>()
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Season with ID {id} not found");

        season.IsActive = false;
        season.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    // ── Segments ─────────────────────────────────────────────────────────────

    public async Task<List<MasterDataDto>> GetSegmentsAsync(Guid tenantId, string? search = null, CancellationToken ct = default)
    {
        var query = _context.Set<Segment>().Where(s => s.TenantId == tenantId && s.IsActive);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.Name.ToLower().Contains(search.ToLower()));

        return await query.OrderBy(s => s.Name)
            .Select(s => new MasterDataDto(s.Id, s.Name, s.IsActive))
            .ToListAsync(ct);
    }

    public async Task<MasterDataDto> GetSegmentByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var segment = await _context.Set<Segment>()
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Segment with ID {id} not found");
        return new MasterDataDto(segment.Id, segment.Name, segment.IsActive);
    }

    public async Task<MasterDataDto> CreateSegmentAsync(Guid tenantId, CreateMasterDataRequest request, Guid createdBy, CancellationToken ct = default)
    {
        var exists = await _context.Set<Segment>().AnyAsync(s => s.TenantId == tenantId && s.Name == request.Name && s.IsActive, ct);
        if (exists) throw new ArgumentException($"Segment '{request.Name}' already exists");

        var segment = new Segment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name,
            IsActive = request.IsActive,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };
        _context.Set<Segment>().Add(segment);
        await _context.SaveChangesAsync(ct);
        return new MasterDataDto(segment.Id, segment.Name, segment.IsActive);
    }

    public async Task<MasterDataDto> UpdateSegmentAsync(Guid id, Guid tenantId, CreateMasterDataRequest request, CancellationToken ct = default)
    {
        var segment = await _context.Set<Segment>()
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Segment with ID {id} not found");

        segment.Name = request.Name;
        segment.IsActive = request.IsActive;
        segment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return new MasterDataDto(segment.Id, segment.Name, segment.IsActive);
    }

    public async Task DeleteSegmentAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var segment = await _context.Set<Segment>()
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Segment with ID {id} not found");

        segment.IsActive = false;
        segment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    // ── SubSegments ──────────────────────────────────────────────────────────

    public async Task<List<SubItemDto>> GetSubSegmentsAsync(Guid tenantId, Guid? segmentId = null, string? search = null, CancellationToken ct = default)
    {
        var query = _context.Set<SubSegment>()
            .Include(ss => ss.Segment)
            .Where(ss => ss.TenantId == tenantId && ss.IsActive);

        if (segmentId.HasValue)
            query = query.Where(ss => ss.SegmentId == segmentId.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(ss => ss.Name.ToLower().Contains(search.ToLower()));

        return await query.OrderBy(ss => ss.Name)
            .Select(ss => new SubItemDto(ss.Id, ss.SegmentId, ss.Segment.Name, ss.Name, ss.IsActive))
            .ToListAsync(ct);
    }

    public async Task<SubItemDto> GetSubSegmentByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var ss = await _context.Set<SubSegment>()
            .Include(s => s.Segment)
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"SubSegment with ID {id} not found");
        return new SubItemDto(ss.Id, ss.SegmentId, ss.Segment.Name, ss.Name, ss.IsActive);
    }

    public async Task<SubItemDto> CreateSubSegmentAsync(Guid tenantId, CreateSubItemRequest request, Guid createdBy, CancellationToken ct = default)
    {
        var parentExists = await _context.Set<Segment>().AnyAsync(s => s.Id == request.ParentId && s.TenantId == tenantId, ct);
        if (!parentExists) throw new KeyNotFoundException($"Segment with ID {request.ParentId} not found");

        var exists = await _context.Set<SubSegment>().AnyAsync(
            ss => ss.TenantId == tenantId && ss.SegmentId == request.ParentId && ss.Name == request.Name && ss.IsActive, ct);
        if (exists) throw new ArgumentException($"SubSegment '{request.Name}' already exists under this segment");

        var subSegment = new SubSegment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SegmentId = request.ParentId,
            Name = request.Name,
            IsActive = request.IsActive,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };
        _context.Set<SubSegment>().Add(subSegment);
        await _context.SaveChangesAsync(ct);

        var segment = await _context.Set<Segment>().FindAsync(new object[] { request.ParentId }, ct);
        return new SubItemDto(subSegment.Id, subSegment.SegmentId, segment!.Name, subSegment.Name, subSegment.IsActive);
    }

    public async Task<SubItemDto> UpdateSubSegmentAsync(Guid id, Guid tenantId, CreateSubItemRequest request, CancellationToken ct = default)
    {
        var subSegment = await _context.Set<SubSegment>()
            .Include(ss => ss.Segment)
            .FirstOrDefaultAsync(ss => ss.Id == id && ss.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"SubSegment with ID {id} not found");

        subSegment.SegmentId = request.ParentId;
        subSegment.Name = request.Name;
        subSegment.IsActive = request.IsActive;
        subSegment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        var segment = await _context.Set<Segment>().FindAsync(new object[] { request.ParentId }, ct);
        return new SubItemDto(subSegment.Id, subSegment.SegmentId, segment!.Name, subSegment.Name, subSegment.IsActive);
    }

    public async Task DeleteSubSegmentAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var subSegment = await _context.Set<SubSegment>()
            .FirstOrDefaultAsync(ss => ss.Id == id && ss.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"SubSegment with ID {id} not found");

        subSegment.IsActive = false;
        subSegment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    // ── Categories ───────────────────────────────────────────────────────────

    public async Task<List<MasterDataDto>> GetCategoriesAsync(Guid tenantId, string? search = null, CancellationToken ct = default)
    {
        var query = _context.Set<Category>().Where(c => c.TenantId == tenantId && c.IsActive);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c => c.Name.ToLower().Contains(search.ToLower()));

        return await query.OrderBy(c => c.Name)
            .Select(c => new MasterDataDto(c.Id, c.Name, c.IsActive))
            .ToListAsync(ct);
    }

    public async Task<MasterDataDto> GetCategoryByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var category = await _context.Set<Category>()
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Category with ID {id} not found");
        return new MasterDataDto(category.Id, category.Name, category.IsActive);
    }

    public async Task<MasterDataDto> CreateCategoryAsync(Guid tenantId, CreateMasterDataRequest request, Guid createdBy, CancellationToken ct = default)
    {
        var exists = await _context.Set<Category>().AnyAsync(c => c.TenantId == tenantId && c.Name == request.Name && c.IsActive, ct);
        if (exists) throw new ArgumentException($"Category '{request.Name}' already exists");

        var category = new Category
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name,
            IsActive = request.IsActive,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };
        _context.Set<Category>().Add(category);
        await _context.SaveChangesAsync(ct);
        return new MasterDataDto(category.Id, category.Name, category.IsActive);
    }

    public async Task<MasterDataDto> UpdateCategoryAsync(Guid id, Guid tenantId, CreateMasterDataRequest request, CancellationToken ct = default)
    {
        var category = await _context.Set<Category>()
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Category with ID {id} not found");

        category.Name = request.Name;
        category.IsActive = request.IsActive;
        category.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return new MasterDataDto(category.Id, category.Name, category.IsActive);
    }

    public async Task DeleteCategoryAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var category = await _context.Set<Category>()
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Category with ID {id} not found");

        category.IsActive = false;
        category.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    // ── SubCategories ────────────────────────────────────────────────────────

    public async Task<List<SubItemDto>> GetSubCategoriesAsync(Guid tenantId, Guid? categoryId = null, string? search = null, CancellationToken ct = default)
    {
        var query = _context.Set<SubCategory>()
            .Include(sc => sc.Category)
            .Where(sc => sc.TenantId == tenantId && sc.IsActive);

        if (categoryId.HasValue)
            query = query.Where(sc => sc.CategoryId == categoryId.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(sc => sc.Name.ToLower().Contains(search.ToLower()));

        return await query.OrderBy(sc => sc.Name)
            .Select(sc => new SubItemDto(sc.Id, sc.CategoryId, sc.Category.Name, sc.Name, sc.IsActive))
            .ToListAsync(ct);
    }

    public async Task<SubItemDto> GetSubCategoryByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var sc = await _context.Set<SubCategory>()
            .Include(s => s.Category)
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"SubCategory with ID {id} not found");
        return new SubItemDto(sc.Id, sc.CategoryId, sc.Category.Name, sc.Name, sc.IsActive);
    }

    public async Task<SubItemDto> CreateSubCategoryAsync(Guid tenantId, CreateSubItemRequest request, Guid createdBy, CancellationToken ct = default)
    {
        var parentExists = await _context.Set<Category>().AnyAsync(c => c.Id == request.ParentId && c.TenantId == tenantId, ct);
        if (!parentExists) throw new KeyNotFoundException($"Category with ID {request.ParentId} not found");

        var exists = await _context.Set<SubCategory>().AnyAsync(
            sc => sc.TenantId == tenantId && sc.CategoryId == request.ParentId && sc.Name == request.Name && sc.IsActive, ct);
        if (exists) throw new ArgumentException($"SubCategory '{request.Name}' already exists under this category");

        var subCategory = new SubCategory
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CategoryId = request.ParentId,
            Name = request.Name,
            IsActive = request.IsActive,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };
        _context.Set<SubCategory>().Add(subCategory);
        await _context.SaveChangesAsync(ct);

        var category = await _context.Set<Category>().FindAsync(new object[] { request.ParentId }, ct);
        return new SubItemDto(subCategory.Id, subCategory.CategoryId, category!.Name, subCategory.Name, subCategory.IsActive);
    }

    public async Task<SubItemDto> UpdateSubCategoryAsync(Guid id, Guid tenantId, CreateSubItemRequest request, CancellationToken ct = default)
    {
        var subCategory = await _context.Set<SubCategory>()
            .Include(sc => sc.Category)
            .FirstOrDefaultAsync(sc => sc.Id == id && sc.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"SubCategory with ID {id} not found");

        subCategory.CategoryId = request.ParentId;
        subCategory.Name = request.Name;
        subCategory.IsActive = request.IsActive;
        subCategory.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        var category = await _context.Set<Category>().FindAsync(new object[] { request.ParentId }, ct);
        return new SubItemDto(subCategory.Id, subCategory.CategoryId, category!.Name, subCategory.Name, subCategory.IsActive);
    }

    public async Task DeleteSubCategoryAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var subCategory = await _context.Set<SubCategory>()
            .FirstOrDefaultAsync(sc => sc.Id == id && sc.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"SubCategory with ID {id} not found");

        subCategory.IsActive = false;
        subCategory.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    // ── Groups ───────────────────────────────────────────────────────────────

    public async Task<List<MasterDataDto>> GetGroupsAsync(Guid tenantId, string? search = null, CancellationToken ct = default)
    {
        var query = _context.Set<Group>().Where(g => g.TenantId == tenantId && g.IsActive);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(g => g.Name.ToLower().Contains(search.ToLower()));

        return await query.OrderBy(g => g.Name)
            .Select(g => new MasterDataDto(g.Id, g.Name, g.IsActive))
            .ToListAsync(ct);
    }

    public async Task<MasterDataDto> GetGroupByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var group = await _context.Set<Group>()
            .FirstOrDefaultAsync(g => g.Id == id && g.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Group with ID {id} not found");
        return new MasterDataDto(group.Id, group.Name, group.IsActive);
    }

    public async Task<MasterDataDto> CreateGroupAsync(Guid tenantId, CreateMasterDataRequest request, Guid createdBy, CancellationToken ct = default)
    {
        var exists = await _context.Set<Group>().AnyAsync(g => g.TenantId == tenantId && g.Name == request.Name && g.IsActive, ct);
        if (exists) throw new ArgumentException($"Group '{request.Name}' already exists");

        var group = new Group
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name,
            IsActive = request.IsActive,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };
        _context.Set<Group>().Add(group);
        await _context.SaveChangesAsync(ct);
        return new MasterDataDto(group.Id, group.Name, group.IsActive);
    }

    public async Task<MasterDataDto> UpdateGroupAsync(Guid id, Guid tenantId, CreateMasterDataRequest request, CancellationToken ct = default)
    {
        var group = await _context.Set<Group>()
            .FirstOrDefaultAsync(g => g.Id == id && g.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Group with ID {id} not found");

        group.Name = request.Name;
        group.IsActive = request.IsActive;
        group.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return new MasterDataDto(group.Id, group.Name, group.IsActive);
    }

    public async Task DeleteGroupAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var group = await _context.Set<Group>()
            .FirstOrDefaultAsync(g => g.Id == id && g.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Group with ID {id} not found");

        group.IsActive = false;
        group.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }
}
