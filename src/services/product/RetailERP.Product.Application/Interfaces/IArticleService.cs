using RetailERP.Shared.Contracts.Common;
using RetailERP.Shared.Contracts.Product;

namespace RetailERP.Product.Application.Interfaces;

public interface IArticleService
{
    Task<ArticleDto> GetByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default);
    Task<PagedResult<ArticleDto>> GetPagedAsync(Guid tenantId, PagedQuery query, Guid? brandId = null,
        Guid? segmentId = null, Guid? categoryId = null, Guid? genderId = null, Guid? seasonId = null,
        bool? isActive = null, CancellationToken ct = default);
    Task<ArticleDto> CreateAsync(Guid tenantId, CreateArticleRequest request, Guid createdBy, CancellationToken ct = default);
    Task<ArticleDto> UpdateAsync(Guid id, Guid tenantId, UpdateArticleRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, Guid tenantId, CancellationToken ct = default);
}

public interface IMasterDataService
{
    // Brands
    Task<List<MasterDataDto>> GetBrandsAsync(Guid tenantId, string? search = null, CancellationToken ct = default);
    Task<MasterDataDto> GetBrandByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default);
    Task<MasterDataDto> CreateBrandAsync(Guid tenantId, CreateMasterDataRequest request, Guid createdBy, CancellationToken ct = default);
    Task<MasterDataDto> UpdateBrandAsync(Guid id, Guid tenantId, CreateMasterDataRequest request, CancellationToken ct = default);
    Task DeleteBrandAsync(Guid id, Guid tenantId, CancellationToken ct = default);

    // Genders
    Task<List<MasterDataDto>> GetGendersAsync(Guid tenantId, string? search = null, CancellationToken ct = default);
    Task<MasterDataDto> GetGenderByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default);
    Task<MasterDataDto> CreateGenderAsync(Guid tenantId, CreateMasterDataRequest request, Guid createdBy, CancellationToken ct = default);
    Task<MasterDataDto> UpdateGenderAsync(Guid id, Guid tenantId, CreateMasterDataRequest request, CancellationToken ct = default);
    Task DeleteGenderAsync(Guid id, Guid tenantId, CancellationToken ct = default);

    // Seasons
    Task<List<SeasonDto>> GetSeasonsAsync(Guid tenantId, string? search = null, CancellationToken ct = default);
    Task<SeasonDto> GetSeasonByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default);
    Task<SeasonDto> CreateSeasonAsync(Guid tenantId, CreateSeasonRequest request, Guid createdBy, CancellationToken ct = default);
    Task<SeasonDto> UpdateSeasonAsync(Guid id, Guid tenantId, CreateSeasonRequest request, CancellationToken ct = default);
    Task DeleteSeasonAsync(Guid id, Guid tenantId, CancellationToken ct = default);

    // Segments
    Task<List<MasterDataDto>> GetSegmentsAsync(Guid tenantId, string? search = null, CancellationToken ct = default);
    Task<MasterDataDto> GetSegmentByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default);
    Task<MasterDataDto> CreateSegmentAsync(Guid tenantId, CreateMasterDataRequest request, Guid createdBy, CancellationToken ct = default);
    Task<MasterDataDto> UpdateSegmentAsync(Guid id, Guid tenantId, CreateMasterDataRequest request, CancellationToken ct = default);
    Task DeleteSegmentAsync(Guid id, Guid tenantId, CancellationToken ct = default);

    // SubSegments
    Task<List<SubItemDto>> GetSubSegmentsAsync(Guid tenantId, Guid? segmentId = null, string? search = null, CancellationToken ct = default);
    Task<SubItemDto> GetSubSegmentByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default);
    Task<SubItemDto> CreateSubSegmentAsync(Guid tenantId, CreateSubItemRequest request, Guid createdBy, CancellationToken ct = default);
    Task<SubItemDto> UpdateSubSegmentAsync(Guid id, Guid tenantId, CreateSubItemRequest request, CancellationToken ct = default);
    Task DeleteSubSegmentAsync(Guid id, Guid tenantId, CancellationToken ct = default);

    // Categories
    Task<List<MasterDataDto>> GetCategoriesAsync(Guid tenantId, string? search = null, CancellationToken ct = default);
    Task<MasterDataDto> GetCategoryByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default);
    Task<MasterDataDto> CreateCategoryAsync(Guid tenantId, CreateMasterDataRequest request, Guid createdBy, CancellationToken ct = default);
    Task<MasterDataDto> UpdateCategoryAsync(Guid id, Guid tenantId, CreateMasterDataRequest request, CancellationToken ct = default);
    Task DeleteCategoryAsync(Guid id, Guid tenantId, CancellationToken ct = default);

    // SubCategories
    Task<List<SubItemDto>> GetSubCategoriesAsync(Guid tenantId, Guid? categoryId = null, string? search = null, CancellationToken ct = default);
    Task<SubItemDto> GetSubCategoryByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default);
    Task<SubItemDto> CreateSubCategoryAsync(Guid tenantId, CreateSubItemRequest request, Guid createdBy, CancellationToken ct = default);
    Task<SubItemDto> UpdateSubCategoryAsync(Guid id, Guid tenantId, CreateSubItemRequest request, CancellationToken ct = default);
    Task DeleteSubCategoryAsync(Guid id, Guid tenantId, CancellationToken ct = default);

    // Groups
    Task<List<MasterDataDto>> GetGroupsAsync(Guid tenantId, string? search = null, CancellationToken ct = default);
    Task<MasterDataDto> GetGroupByIdAsync(Guid id, Guid tenantId, CancellationToken ct = default);
    Task<MasterDataDto> CreateGroupAsync(Guid tenantId, CreateMasterDataRequest request, Guid createdBy, CancellationToken ct = default);
    Task<MasterDataDto> UpdateGroupAsync(Guid id, Guid tenantId, CreateMasterDataRequest request, CancellationToken ct = default);
    Task DeleteGroupAsync(Guid id, Guid tenantId, CancellationToken ct = default);
}
