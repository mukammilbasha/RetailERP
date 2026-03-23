using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RetailERP.Product.Application.Interfaces;
using RetailERP.Shared.Contracts.Common;
using RetailERP.Shared.Contracts.Product;

namespace RetailERP.Product.API.Controllers;

// ── Brands ──────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BrandsController : ControllerBase
{
    private readonly IMasterDataService _service;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public BrandsController(IMasterDataService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetAll(
        [FromQuery] string? search, [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var result = await _service.GetBrandsAsync(TenantId, search ?? searchTerm, ct);
        var totalCount = result.Count;
        var paged = result.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();
        var response = new
        {
            items = paged.Select(b => new { brandId = b.Id, brandName = b.Name, isActive = b.IsActive }),
            totalCount
        };
        return Ok(ApiResponse<object>.Ok(response));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetBrandByIdAsync(id, TenantId, ct);
        return Ok(ApiResponse<object>.Ok(new { brandId = result.Id, brandName = result.Name, isActive = result.IsActive }));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Create(
        [FromBody] CreateMasterDataRequest request, CancellationToken ct)
    {
        var result = await _service.CreateBrandAsync(TenantId, request, UserId, ct);
        var mapped = new { brandId = result.Id, brandName = result.Name, isActive = result.IsActive };
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<object>.Ok(mapped, "Brand created"));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Update(
        Guid id, [FromBody] CreateMasterDataRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateBrandAsync(id, TenantId, request, ct);
        return Ok(ApiResponse<object>.Ok(
            new { brandId = result.Id, brandName = result.Name, isActive = result.IsActive }, "Brand updated"));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteBrandAsync(id, TenantId, ct);
        return Ok(ApiResponse<bool>.Ok(true, "Brand deleted"));
    }
}

// ── Genders ─────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GendersController : ControllerBase
{
    private readonly IMasterDataService _service;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public GendersController(IMasterDataService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetAll(
        [FromQuery] string? search, [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var result = await _service.GetGendersAsync(TenantId, search ?? searchTerm, ct);
        var totalCount = result.Count;
        var paged = result.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();
        var response = new
        {
            items = paged.Select(g => new { genderId = g.Id, genderName = g.Name, isActive = g.IsActive }),
            totalCount
        };
        return Ok(ApiResponse<object>.Ok(response));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetGenderByIdAsync(id, TenantId, ct);
        return Ok(ApiResponse<object>.Ok(new { genderId = result.Id, genderName = result.Name, isActive = result.IsActive }));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Create(
        [FromBody] CreateMasterDataRequest request, CancellationToken ct)
    {
        var result = await _service.CreateGenderAsync(TenantId, request, UserId, ct);
        var mapped = new { genderId = result.Id, genderName = result.Name, isActive = result.IsActive };
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<object>.Ok(mapped, "Gender created"));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Update(
        Guid id, [FromBody] CreateMasterDataRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateGenderAsync(id, TenantId, request, ct);
        return Ok(ApiResponse<object>.Ok(
            new { genderId = result.Id, genderName = result.Name, isActive = result.IsActive }, "Gender updated"));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteGenderAsync(id, TenantId, ct);
        return Ok(ApiResponse<bool>.Ok(true, "Gender deleted"));
    }
}

// ── Seasons ─────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SeasonsController : ControllerBase
{
    private readonly IMasterDataService _service;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public SeasonsController(IMasterDataService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetAll(
        [FromQuery] string? search, [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var result = await _service.GetSeasonsAsync(TenantId, search ?? searchTerm, ct);
        var totalCount = result.Count;
        var paged = result.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();
        var response = new
        {
            items = paged.Select(s => new { seasonId = s.SeasonId, seasonCode = s.SeasonCode, startDate = s.StartDate, endDate = s.EndDate, isActive = s.IsActive }),
            totalCount
        };
        return Ok(ApiResponse<object>.Ok(response));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SeasonDto>>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetSeasonByIdAsync(id, TenantId, ct);
        return Ok(ApiResponse<SeasonDto>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<SeasonDto>>> Create(
        [FromBody] CreateSeasonRequest request, CancellationToken ct)
    {
        var result = await _service.CreateSeasonAsync(TenantId, request, UserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.SeasonId },
            ApiResponse<SeasonDto>.Ok(result, "Season created"));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SeasonDto>>> Update(
        Guid id, [FromBody] CreateSeasonRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateSeasonAsync(id, TenantId, request, ct);
        return Ok(ApiResponse<SeasonDto>.Ok(result, "Season updated"));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteSeasonAsync(id, TenantId, ct);
        return Ok(ApiResponse<bool>.Ok(true, "Season deleted"));
    }
}

// ── Segments ────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SegmentsController : ControllerBase
{
    private readonly IMasterDataService _service;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public SegmentsController(IMasterDataService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetAll(
        [FromQuery] string? search, [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var result = await _service.GetSegmentsAsync(TenantId, search ?? searchTerm, ct);
        var totalCount = result.Count;
        var paged = result.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();
        var response = new
        {
            items = paged.Select(s => new { segmentId = s.Id, segmentName = s.Name, isActive = s.IsActive }),
            totalCount
        };
        return Ok(ApiResponse<object>.Ok(response));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetSegmentByIdAsync(id, TenantId, ct);
        return Ok(ApiResponse<object>.Ok(new { segmentId = result.Id, segmentName = result.Name, isActive = result.IsActive }));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Create(
        [FromBody] CreateMasterDataRequest request, CancellationToken ct)
    {
        var result = await _service.CreateSegmentAsync(TenantId, request, UserId, ct);
        var mapped = new { segmentId = result.Id, segmentName = result.Name, isActive = result.IsActive };
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<object>.Ok(mapped, "Segment created"));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Update(
        Guid id, [FromBody] CreateMasterDataRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateSegmentAsync(id, TenantId, request, ct);
        return Ok(ApiResponse<object>.Ok(
            new { segmentId = result.Id, segmentName = result.Name, isActive = result.IsActive }, "Segment updated"));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteSegmentAsync(id, TenantId, ct);
        return Ok(ApiResponse<bool>.Ok(true, "Segment deleted"));
    }
}

// ── SubSegments ─────────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubSegmentsController : ControllerBase
{
    private readonly IMasterDataService _service;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public SubSegmentsController(IMasterDataService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetAll(
        [FromQuery] Guid? segmentId, [FromQuery] string? search, [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var result = await _service.GetSubSegmentsAsync(TenantId, segmentId, search ?? searchTerm, ct);
        var totalCount = result.Count;
        var paged = result.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();
        var response = new
        {
            items = paged.Select(ss => new { subSegmentId = ss.Id, subSegmentName = ss.Name, segmentId = ss.ParentId, segmentName = ss.ParentName, isActive = ss.IsActive }),
            totalCount
        };
        return Ok(ApiResponse<object>.Ok(response));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetSubSegmentByIdAsync(id, TenantId, ct);
        return Ok(ApiResponse<object>.Ok(
            new { subSegmentId = result.Id, subSegmentName = result.Name, segmentId = result.ParentId, segmentName = result.ParentName, isActive = result.IsActive }));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Create(
        [FromBody] CreateSubItemRequest request, CancellationToken ct)
    {
        var result = await _service.CreateSubSegmentAsync(TenantId, request, UserId, ct);
        var mapped = new { subSegmentId = result.Id, subSegmentName = result.Name, segmentId = result.ParentId, segmentName = result.ParentName, isActive = result.IsActive };
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<object>.Ok(mapped, "SubSegment created"));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Update(
        Guid id, [FromBody] CreateSubItemRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateSubSegmentAsync(id, TenantId, request, ct);
        return Ok(ApiResponse<object>.Ok(
            new { subSegmentId = result.Id, subSegmentName = result.Name, segmentId = result.ParentId, segmentName = result.ParentName, isActive = result.IsActive }, "SubSegment updated"));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteSubSegmentAsync(id, TenantId, ct);
        return Ok(ApiResponse<bool>.Ok(true, "SubSegment deleted"));
    }
}

// ── Categories ──────────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly IMasterDataService _service;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public CategoriesController(IMasterDataService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetAll(
        [FromQuery] string? search, [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var result = await _service.GetCategoriesAsync(TenantId, search ?? searchTerm, ct);
        var totalCount = result.Count;
        var paged = result.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();
        var response = new
        {
            items = paged.Select(c => new { categoryId = c.Id, categoryName = c.Name, isActive = c.IsActive }),
            totalCount
        };
        return Ok(ApiResponse<object>.Ok(response));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetCategoryByIdAsync(id, TenantId, ct);
        return Ok(ApiResponse<object>.Ok(new { categoryId = result.Id, categoryName = result.Name, isActive = result.IsActive }));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Create(
        [FromBody] CreateMasterDataRequest request, CancellationToken ct)
    {
        var result = await _service.CreateCategoryAsync(TenantId, request, UserId, ct);
        var mapped = new { categoryId = result.Id, categoryName = result.Name, isActive = result.IsActive };
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<object>.Ok(mapped, "Category created"));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Update(
        Guid id, [FromBody] CreateMasterDataRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateCategoryAsync(id, TenantId, request, ct);
        return Ok(ApiResponse<object>.Ok(
            new { categoryId = result.Id, categoryName = result.Name, isActive = result.IsActive }, "Category updated"));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteCategoryAsync(id, TenantId, ct);
        return Ok(ApiResponse<bool>.Ok(true, "Category deleted"));
    }
}

// ── SubCategories ───────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubCategoriesController : ControllerBase
{
    private readonly IMasterDataService _service;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public SubCategoriesController(IMasterDataService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetAll(
        [FromQuery] Guid? categoryId, [FromQuery] string? search, [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var result = await _service.GetSubCategoriesAsync(TenantId, categoryId, search ?? searchTerm, ct);
        var totalCount = result.Count;
        var paged = result.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();
        var response = new
        {
            items = paged.Select(sc => new { subCategoryId = sc.Id, subCategoryName = sc.Name, categoryId = sc.ParentId, categoryName = sc.ParentName, isActive = sc.IsActive }),
            totalCount
        };
        return Ok(ApiResponse<object>.Ok(response));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetSubCategoryByIdAsync(id, TenantId, ct);
        return Ok(ApiResponse<object>.Ok(
            new { subCategoryId = result.Id, subCategoryName = result.Name, categoryId = result.ParentId, categoryName = result.ParentName, isActive = result.IsActive }));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Create(
        [FromBody] CreateSubItemRequest request, CancellationToken ct)
    {
        var result = await _service.CreateSubCategoryAsync(TenantId, request, UserId, ct);
        var mapped = new { subCategoryId = result.Id, subCategoryName = result.Name, categoryId = result.ParentId, categoryName = result.ParentName, isActive = result.IsActive };
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<object>.Ok(mapped, "SubCategory created"));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Update(
        Guid id, [FromBody] CreateSubItemRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateSubCategoryAsync(id, TenantId, request, ct);
        return Ok(ApiResponse<object>.Ok(
            new { subCategoryId = result.Id, subCategoryName = result.Name, categoryId = result.ParentId, categoryName = result.ParentName, isActive = result.IsActive }, "SubCategory updated"));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteSubCategoryAsync(id, TenantId, ct);
        return Ok(ApiResponse<bool>.Ok(true, "SubCategory deleted"));
    }
}

// ── Groups ──────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroupsController : ControllerBase
{
    private readonly IMasterDataService _service;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public GroupsController(IMasterDataService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetAll(
        [FromQuery] string? search, [FromQuery] string? searchTerm,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var result = await _service.GetGroupsAsync(TenantId, search ?? searchTerm, ct);
        var totalCount = result.Count;
        var paged = result.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();
        var response = new
        {
            items = paged.Select(g => new { groupId = g.Id, groupName = g.Name, isActive = g.IsActive }),
            totalCount
        };
        return Ok(ApiResponse<object>.Ok(response));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetGroupByIdAsync(id, TenantId, ct);
        return Ok(ApiResponse<object>.Ok(new { groupId = result.Id, groupName = result.Name, isActive = result.IsActive }));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Create(
        [FromBody] CreateMasterDataRequest request, CancellationToken ct)
    {
        var result = await _service.CreateGroupAsync(TenantId, request, UserId, ct);
        var mapped = new { groupId = result.Id, groupName = result.Name, isActive = result.IsActive };
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<object>.Ok(mapped, "Group created"));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Update(
        Guid id, [FromBody] CreateMasterDataRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateGroupAsync(id, TenantId, request, ct);
        return Ok(ApiResponse<object>.Ok(
            new { groupId = result.Id, groupName = result.Name, isActive = result.IsActive }, "Group updated"));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteGroupAsync(id, TenantId, ct);
        return Ok(ApiResponse<bool>.Ok(true, "Group deleted"));
    }
}

// ── Size Charts ─────────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SizeChartsController : ControllerBase
{
    private readonly Microsoft.EntityFrameworkCore.DbContext _context;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public SizeChartsController(Microsoft.EntityFrameworkCore.DbContext context) => _context = context;

    [HttpGet("{articleId:guid}")]
    public async Task<ActionResult<ApiResponse<List<ArticleSizeDto>>>> GetByArticle(
        Guid articleId, CancellationToken ct)
    {
        var sizes = await _context.Set<Domain.Entities.ArticleSize>()
            .Where(s => s.ArticleId == articleId && s.TenantId == TenantId)
            .OrderBy(s => s.EuroSize)
            .Select(s => new ArticleSizeDto(s.Id, s.EuroSize, s.UKSize, s.USSize, s.EANCode, s.MRP))
            .ToListAsync(ct);

        return Ok(ApiResponse<List<ArticleSizeDto>>.Ok(sizes));
    }

    [HttpPost("{articleId:guid}")]
    public async Task<ActionResult<ApiResponse<ArticleSizeDto>>> AddSize(
        Guid articleId, [FromBody] ArticleSizeDto request, CancellationToken ct)
    {
        var article = await _context.Set<Domain.Entities.Article>()
            .FirstOrDefaultAsync(a => a.Id == articleId && a.TenantId == TenantId, ct)
            ?? throw new KeyNotFoundException($"Article with ID {articleId} not found");

        var size = new Domain.Entities.ArticleSize
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            ArticleId = articleId,
            EuroSize = request.EuroSize,
            UKSize = request.UKSize,
            USSize = request.USSize,
            EANCode = request.EANCode,
            MRP = request.MRP,
            CreatedBy = UserId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Set<Domain.Entities.ArticleSize>().Add(size);
        await _context.SaveChangesAsync(ct);

        var dto = new ArticleSizeDto(size.Id, size.EuroSize, size.UKSize, size.USSize, size.EANCode, size.MRP);
        return CreatedAtAction(nameof(GetByArticle), new { articleId },
            ApiResponse<ArticleSizeDto>.Ok(dto, "Size added"));
    }

    [HttpPut("{articleId:guid}/{sizeId:guid}")]
    public async Task<ActionResult<ApiResponse<ArticleSizeDto>>> UpdateSize(
        Guid articleId, Guid sizeId, [FromBody] ArticleSizeDto request, CancellationToken ct)
    {
        var size = await _context.Set<Domain.Entities.ArticleSize>()
            .FirstOrDefaultAsync(s => s.Id == sizeId && s.ArticleId == articleId && s.TenantId == TenantId, ct)
            ?? throw new KeyNotFoundException($"Size with ID {sizeId} not found");

        size.EuroSize = request.EuroSize;
        size.UKSize = request.UKSize;
        size.USSize = request.USSize;
        size.EANCode = request.EANCode;
        size.MRP = request.MRP;
        size.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        var dto = new ArticleSizeDto(size.Id, size.EuroSize, size.UKSize, size.USSize, size.EANCode, size.MRP);
        return Ok(ApiResponse<ArticleSizeDto>.Ok(dto, "Size updated"));
    }

    [HttpDelete("{articleId:guid}/{sizeId:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteSize(
        Guid articleId, Guid sizeId, CancellationToken ct)
    {
        var size = await _context.Set<Domain.Entities.ArticleSize>()
            .FirstOrDefaultAsync(s => s.Id == sizeId && s.ArticleId == articleId && s.TenantId == TenantId, ct)
            ?? throw new KeyNotFoundException($"Size with ID {sizeId} not found");

        _context.Set<Domain.Entities.ArticleSize>().Remove(size);
        await _context.SaveChangesAsync(ct);

        return Ok(ApiResponse<bool>.Ok(true, "Size deleted"));
    }
}
