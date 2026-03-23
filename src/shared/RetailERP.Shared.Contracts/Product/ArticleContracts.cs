namespace RetailERP.Shared.Contracts.Product;

public record ArticleDto(
    Guid ArticleId,
    string ArticleCode,
    string ArticleName,
    Guid BrandId,
    string BrandName,
    Guid SegmentId,
    string SegmentName,
    Guid CategoryId,
    string CategoryName,
    Guid? SubSegmentId,
    string? SubCategoryName,
    Guid? SubCategoryId,
    string? GroupName,
    Guid? GroupId,
    string? SeasonCode,
    Guid? SeasonId,
    Guid GenderId,
    string GenderName,
    string Color,
    string? Style,
    string? Fastener,
    string HSNCode,
    string UOM,
    decimal MRP,
    decimal CBD,
    bool IsSizeBased,
    bool IsActive,
    string? ImageUrl,
    DateTime? LaunchDate,
    FootwearDetailDto? FootwearDetails,
    LeatherGoodsDetailDto? LeatherGoodsDetails,
    List<ArticleSizeDto> Sizes
);

public record FootwearDetailDto(
    string? Last,
    string? UpperLeather,
    string? LiningLeather,
    string? Sole,
    int? SizeRunFrom,
    int? SizeRunTo
);

public record LeatherGoodsDetailDto(
    string? Dimensions,
    string? Security
);

public record ArticleSizeDto(
    Guid ArticleSizeId,
    int EuroSize,
    decimal? UKSize,
    decimal? USSize,
    string? EANCode,
    decimal? MRP
);

public record CreateArticleRequest(
    string ArticleCode,
    string ArticleName,
    Guid BrandId,
    Guid SegmentId,
    Guid? SubSegmentId,
    Guid CategoryId,
    Guid? SubCategoryId,
    Guid? GroupId,
    Guid? SeasonId,
    Guid GenderId,
    string Color,
    string? Style,
    string? Fastener,
    string HSNCode,
    string UOM,
    decimal MRP,
    decimal CBD,
    bool IsSizeBased,
    DateTime? LaunchDate,
    string? ImageUrl,
    FootwearDetailDto? FootwearDetails,
    LeatherGoodsDetailDto? LeatherGoodsDetails,
    // Flat fields for convenience (used if FootwearDetails/LeatherGoodsDetails are null)
    string? Last,
    string? Sole,
    string? UpperLeather,
    string? LiningLeather,
    int? SizeRunFrom,
    int? SizeRunTo,
    string? Dimensions,
    string? Security
);

public record UpdateArticleRequest(
    string ArticleName,
    Guid BrandId,
    Guid SegmentId,
    Guid? SubSegmentId,
    Guid CategoryId,
    Guid? SubCategoryId,
    Guid? GroupId,
    Guid? SeasonId,
    Guid GenderId,
    string Color,
    string? Style,
    string? Fastener,
    string HSNCode,
    string UOM,
    decimal MRP,
    decimal CBD,
    bool IsSizeBased,
    bool IsActive,
    FootwearDetailDto? FootwearDetails,
    LeatherGoodsDetailDto? LeatherGoodsDetails,
    // Flat fields for convenience
    string? Last,
    string? Sole,
    string? UpperLeather,
    string? LiningLeather,
    int? SizeRunFrom,
    int? SizeRunTo,
    string? Dimensions,
    string? Security
);

public record MasterDataDto(Guid Id, string Name, bool IsActive);

public record CreateMasterDataRequest(string Name, bool IsActive = true);

public record SeasonDto(Guid SeasonId, string SeasonCode, DateTime StartDate, DateTime EndDate, bool IsActive);

public record CreateSeasonRequest(string SeasonCode, DateTime StartDate, DateTime EndDate);

public record SubItemDto(Guid Id, Guid ParentId, string ParentName, string Name, bool IsActive);

public record CreateSubItemRequest(Guid ParentId, string Name, bool IsActive = true);
