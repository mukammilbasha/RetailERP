using Microsoft.EntityFrameworkCore;
using RetailERP.Product.Application.Interfaces;
using RetailERP.Product.Domain.Entities;
using RetailERP.Shared.Contracts.Common;
using RetailERP.Shared.Contracts.Product;

namespace RetailERP.Product.Application.Services;

public class ArticleService : IArticleService
{
    private readonly DbContext _context;

    public ArticleService(DbContext context)
    {
        _context = context;
    }

    public async Task<ArticleDto> GetByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var article = await GetArticleQuery()
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Article with ID {id} not found");

        return MapToDto(article);
    }

    public async Task<PagedResult<ArticleDto>> GetPagedAsync(
        Guid tenantId, PagedQuery query, Guid? brandId = null,
        Guid? segmentId = null, Guid? categoryId = null, Guid? genderId = null,
        Guid? seasonId = null, bool? isActive = null, CancellationToken ct = default)
    {
        var dbQuery = GetArticleQuery()
            .Where(a => a.TenantId == tenantId);

        // Apply filters
        if (brandId.HasValue)
            dbQuery = dbQuery.Where(a => a.BrandId == brandId.Value);

        if (segmentId.HasValue)
            dbQuery = dbQuery.Where(a => a.SegmentId == segmentId.Value);

        if (categoryId.HasValue)
            dbQuery = dbQuery.Where(a => a.CategoryId == categoryId.Value);

        if (genderId.HasValue)
            dbQuery = dbQuery.Where(a => a.GenderId == genderId.Value);

        if (seasonId.HasValue)
            dbQuery = dbQuery.Where(a => a.SeasonId == seasonId.Value);

        if (isActive.HasValue)
            dbQuery = dbQuery.Where(a => a.IsActive == isActive.Value);

        // Apply search
        if (!string.IsNullOrWhiteSpace(query.SearchTerm))
        {
            var search = query.SearchTerm.ToLower();
            dbQuery = dbQuery.Where(a =>
                a.ArticleCode.ToLower().Contains(search) ||
                a.ArticleName.ToLower().Contains(search) ||
                a.Brand.Name.ToLower().Contains(search) ||
                a.Color.ToLower().Contains(search));
        }

        // Apply sorting
        dbQuery = query.SortBy?.ToLower() switch
        {
            "code" => query.SortDescending ? dbQuery.OrderByDescending(a => a.ArticleCode) : dbQuery.OrderBy(a => a.ArticleCode),
            "name" => query.SortDescending ? dbQuery.OrderByDescending(a => a.ArticleName) : dbQuery.OrderBy(a => a.ArticleName),
            "brand" => query.SortDescending ? dbQuery.OrderByDescending(a => a.Brand.Name) : dbQuery.OrderBy(a => a.Brand.Name),
            "mrp" => query.SortDescending ? dbQuery.OrderByDescending(a => a.MRP) : dbQuery.OrderBy(a => a.MRP),
            "createdat" => query.SortDescending ? dbQuery.OrderByDescending(a => a.CreatedAt) : dbQuery.OrderBy(a => a.CreatedAt),
            _ => dbQuery.OrderByDescending(a => a.CreatedAt)
        };

        var totalCount = await dbQuery.CountAsync(ct);

        var items = await dbQuery
            .Skip((query.PageNumber - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<ArticleDto>
        {
            Items = items.Select(MapToDto).ToList(),
            TotalCount = totalCount,
            PageNumber = query.PageNumber,
            PageSize = query.PageSize
        };
    }

    public async Task<ArticleDto> CreateAsync(Guid tenantId, CreateArticleRequest request, Guid createdBy, CancellationToken ct = default)
    {
        // Validate unique article code within tenant
        var exists = await _context.Set<Article>()
            .AnyAsync(a => a.TenantId == tenantId && a.ArticleCode == request.ArticleCode, ct);
        if (exists)
            throw new ArgumentException($"Article code '{request.ArticleCode}' already exists");

        var article = new Article
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ArticleCode = request.ArticleCode,
            ArticleName = request.ArticleName,
            BrandId = request.BrandId,
            SegmentId = request.SegmentId,
            SubSegmentId = request.SubSegmentId,
            CategoryId = request.CategoryId,
            SubCategoryId = request.SubCategoryId,
            GroupId = request.GroupId,
            SeasonId = request.SeasonId,
            GenderId = request.GenderId,
            Color = request.Color,
            Style = request.Style,
            Fastener = request.Fastener,
            HSNCode = request.HSNCode,
            UOM = request.UOM,
            MRP = request.MRP,
            CBD = request.CBD,
            IsSizeBased = request.IsSizeBased,
            LaunchDate = request.LaunchDate,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };

        _context.Set<Article>().Add(article);

        // Add footwear details - support both nested and flat fields
        var fwDetails = request.FootwearDetails;
        var hasFootwear = fwDetails != null ||
            !string.IsNullOrEmpty(request.Last) || !string.IsNullOrEmpty(request.Sole) ||
            !string.IsNullOrEmpty(request.UpperLeather) || !string.IsNullOrEmpty(request.LiningLeather) ||
            request.SizeRunFrom.HasValue || request.SizeRunTo.HasValue;

        if (hasFootwear)
        {
            var footwearDetail = new FootwearDetail
            {
                FootwearDetailId = Guid.NewGuid(),
                ArticleId = article.Id,
                Last = fwDetails?.Last ?? request.Last,
                UpperLeather = fwDetails?.UpperLeather ?? request.UpperLeather,
                LiningLeather = fwDetails?.LiningLeather ?? request.LiningLeather,
                Sole = fwDetails?.Sole ?? request.Sole,
                SizeRunFrom = request.SizeRunFrom ?? fwDetails?.SizeRunFrom,
                SizeRunTo = request.SizeRunTo ?? fwDetails?.SizeRunTo
            };
            _context.Set<FootwearDetail>().Add(footwearDetail);

            // Auto-generate sizes from size run
            if (footwearDetail.SizeRunFrom.HasValue && footwearDetail.SizeRunTo.HasValue)
            {
                for (int size = footwearDetail.SizeRunFrom.Value; size <= footwearDetail.SizeRunTo.Value; size++)
                {
                    _context.Set<ArticleSize>().Add(new ArticleSize
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        ArticleId = article.Id,
                        EuroSize = size,
                        MRP = request.MRP,
                        CreatedBy = createdBy,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        // Add leather goods details - support both nested and flat fields
        var lgDetails = request.LeatherGoodsDetails;
        var hasLeather = lgDetails != null ||
            !string.IsNullOrEmpty(request.Dimensions) || !string.IsNullOrEmpty(request.Security);

        if (hasLeather)
        {
            var leatherDetail = new LeatherGoodsDetail
            {
                LeatherGoodsDetailId = Guid.NewGuid(),
                ArticleId = article.Id,
                Dimensions = lgDetails?.Dimensions ?? request.Dimensions,
                Security = lgDetails?.Security ?? request.Security
            };
            _context.Set<LeatherGoodsDetail>().Add(leatherDetail);
        }

        await _context.SaveChangesAsync(ct);

        // Reload with navigation properties
        return await GetByIdAsync(article.Id, tenantId, ct);
    }

    public async Task<ArticleDto> UpdateAsync(Guid id, Guid tenantId, UpdateArticleRequest request, CancellationToken ct = default)
    {
        var article = await _context.Set<Article>()
            .Include(a => a.FootwearDetail)
            .Include(a => a.LeatherGoodsDetail)
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Article with ID {id} not found");

        article.ArticleName = request.ArticleName;
        article.BrandId = request.BrandId;
        article.SegmentId = request.SegmentId;
        article.SubSegmentId = request.SubSegmentId;
        article.CategoryId = request.CategoryId;
        article.SubCategoryId = request.SubCategoryId;
        article.GroupId = request.GroupId;
        article.SeasonId = request.SeasonId;
        article.GenderId = request.GenderId;
        article.Color = request.Color;
        article.Style = request.Style;
        article.Fastener = request.Fastener;
        article.HSNCode = request.HSNCode;
        article.UOM = request.UOM;
        article.MRP = request.MRP;
        article.CBD = request.CBD;
        article.IsSizeBased = request.IsSizeBased;
        article.IsActive = request.IsActive;
        article.UpdatedAt = DateTime.UtcNow;

        // Update footwear details - support both nested and flat fields
        var fwReq = request.FootwearDetails;
        var hasFw = fwReq != null ||
            !string.IsNullOrEmpty(request.Last) || !string.IsNullOrEmpty(request.Sole) ||
            !string.IsNullOrEmpty(request.UpperLeather) || !string.IsNullOrEmpty(request.LiningLeather) ||
            request.SizeRunFrom.HasValue || request.SizeRunTo.HasValue;

        if (hasFw)
        {
            var last = fwReq?.Last ?? request.Last;
            var upper = fwReq?.UpperLeather ?? request.UpperLeather;
            var lining = fwReq?.LiningLeather ?? request.LiningLeather;
            var sole = fwReq?.Sole ?? request.Sole;
            var sizeFrom = request.SizeRunFrom ?? fwReq?.SizeRunFrom;
            var sizeTo = request.SizeRunTo ?? fwReq?.SizeRunTo;

            if (article.FootwearDetail != null)
            {
                article.FootwearDetail.Last = last;
                article.FootwearDetail.UpperLeather = upper;
                article.FootwearDetail.LiningLeather = lining;
                article.FootwearDetail.Sole = sole;
                article.FootwearDetail.SizeRunFrom = sizeFrom;
                article.FootwearDetail.SizeRunTo = sizeTo;
            }
            else
            {
                _context.Set<FootwearDetail>().Add(new FootwearDetail
                {
                    FootwearDetailId = Guid.NewGuid(),
                    ArticleId = article.Id,
                    Last = last, UpperLeather = upper, LiningLeather = lining,
                    Sole = sole, SizeRunFrom = sizeFrom, SizeRunTo = sizeTo
                });
            }
        }

        // Update leather goods details - support both nested and flat fields
        var lgReq = request.LeatherGoodsDetails;
        var hasLg = lgReq != null ||
            !string.IsNullOrEmpty(request.Dimensions) || !string.IsNullOrEmpty(request.Security);

        if (hasLg)
        {
            var dims = lgReq?.Dimensions ?? request.Dimensions;
            var sec = lgReq?.Security ?? request.Security;

            if (article.LeatherGoodsDetail != null)
            {
                article.LeatherGoodsDetail.Dimensions = dims;
                article.LeatherGoodsDetail.Security = sec;
            }
            else
            {
                _context.Set<LeatherGoodsDetail>().Add(new LeatherGoodsDetail
                {
                    LeatherGoodsDetailId = Guid.NewGuid(),
                    ArticleId = article.Id,
                    Dimensions = dims, Security = sec
                });
            }
        }

        await _context.SaveChangesAsync(ct);

        return await GetByIdAsync(article.Id, tenantId, ct);
    }

    public async Task DeleteAsync(Guid id, Guid tenantId, CancellationToken ct = default)
    {
        var article = await _context.Set<Article>()
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenantId, ct)
            ?? throw new KeyNotFoundException($"Article with ID {id} not found");

        // Soft delete
        article.IsActive = false;
        article.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    private IQueryable<Article> GetArticleQuery()
    {
        return _context.Set<Article>()
            .Include(a => a.Brand)
            .Include(a => a.Segment)
            .Include(a => a.SubSegment)
            .Include(a => a.Category)
            .Include(a => a.SubCategory)
            .Include(a => a.Group)
            .Include(a => a.Season)
            .Include(a => a.Gender)
            .Include(a => a.FootwearDetail)
            .Include(a => a.LeatherGoodsDetail)
            .Include(a => a.Sizes)
            .AsNoTracking();
    }

    private static ArticleDto MapToDto(Article a)
    {
        return new ArticleDto(
            ArticleId: a.Id,
            ArticleCode: a.ArticleCode,
            ArticleName: a.ArticleName,
            BrandId: a.BrandId,
            BrandName: a.Brand?.Name ?? string.Empty,
            SegmentId: a.SegmentId,
            SegmentName: a.Segment?.Name ?? string.Empty,
            CategoryId: a.CategoryId,
            CategoryName: a.Category?.Name ?? string.Empty,
            SubSegmentId: a.SubSegmentId,
            SubCategoryName: a.SubCategory?.Name,
            SubCategoryId: a.SubCategoryId,
            GroupName: a.Group?.Name,
            GroupId: a.GroupId,
            SeasonCode: a.Season?.SeasonCode,
            SeasonId: a.SeasonId,
            GenderId: a.GenderId,
            GenderName: a.Gender?.Name ?? string.Empty,
            Color: a.Color,
            Style: a.Style,
            Fastener: a.Fastener,
            HSNCode: a.HSNCode,
            UOM: a.UOM,
            MRP: a.MRP,
            CBD: a.CBD,
            IsSizeBased: a.IsSizeBased,
            IsActive: a.IsActive,
            ImageUrl: a.ImageUrl,
            LaunchDate: a.LaunchDate,
            FootwearDetails: a.FootwearDetail != null
                ? new FootwearDetailDto(
                    a.FootwearDetail.Last,
                    a.FootwearDetail.UpperLeather,
                    a.FootwearDetail.LiningLeather,
                    a.FootwearDetail.Sole,
                    a.FootwearDetail.SizeRunFrom,
                    a.FootwearDetail.SizeRunTo)
                : null,
            LeatherGoodsDetails: a.LeatherGoodsDetail != null
                ? new LeatherGoodsDetailDto(
                    a.LeatherGoodsDetail.Dimensions,
                    a.LeatherGoodsDetail.Security)
                : null,
            Sizes: a.Sizes.Select(s => new ArticleSizeDto(
                s.Id,
                s.EuroSize,
                s.UKSize,
                s.USSize,
                s.EANCode,
                s.MRP
            )).ToList()
        );
    }
}
