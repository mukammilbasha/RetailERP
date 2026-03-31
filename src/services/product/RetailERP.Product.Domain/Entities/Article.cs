using RetailERP.Shared.Domain.Entities;

namespace RetailERP.Product.Domain.Entities;

public class Article : BaseAuditableEntity
{
    public string ArticleCode { get; set; } = string.Empty;
    public string ArticleName { get; set; } = string.Empty;
    public Guid BrandId { get; set; }
    public Guid SegmentId { get; set; }
    public Guid? SubSegmentId { get; set; }
    public Guid CategoryId { get; set; }
    public Guid? SubCategoryId { get; set; }
    public Guid? GroupId { get; set; }
    public Guid? SeasonId { get; set; }
    public Guid GenderId { get; set; }
    public string Color { get; set; } = string.Empty;
    public string? Style { get; set; }
    public string? Fastener { get; set; }
    public string HSNCode { get; set; } = string.Empty;
    public string UOM { get; set; } = "PCS";
    public decimal MRP { get; set; }
    public decimal CBD { get; set; }
    public bool IsSizeBased { get; set; }
    public DateTime? LaunchDate { get; set; }
    public string? ImageUrl { get; set; }

    // Navigation properties
    public Brand Brand { get; set; } = null!;
    public Segment Segment { get; set; } = null!;
    public SubSegment? SubSegment { get; set; }
    public Category Category { get; set; } = null!;
    public SubCategory? SubCategory { get; set; }
    public Group? Group { get; set; }
    public Season? Season { get; set; }
    public Gender Gender { get; set; } = null!;
    public FootwearDetail? FootwearDetail { get; set; }
    public LeatherGoodsDetail? LeatherGoodsDetail { get; set; }
    public ICollection<ArticleSize> Sizes { get; set; } = new List<ArticleSize>();
}

public class Brand : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public ICollection<Article> Articles { get; set; } = new List<Article>();
}

public class Gender : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public ICollection<Article> Articles { get; set; } = new List<Article>();
}

public class Season : BaseAuditableEntity
{
    public string SeasonCode { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    public ICollection<Article> Articles { get; set; } = new List<Article>();
}

public class Segment : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public ICollection<SubSegment> SubSegments { get; set; } = new List<SubSegment>();
    public ICollection<Article> Articles { get; set; } = new List<Article>();
}

public class SubSegment : BaseAuditableEntity
{
    public Guid SegmentId { get; set; }
    public string Name { get; set; } = string.Empty;

    public Segment Segment { get; set; } = null!;
    public ICollection<Article> Articles { get; set; } = new List<Article>();
}

public class Category : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public ICollection<SubCategory> SubCategories { get; set; } = new List<SubCategory>();
    public ICollection<Article> Articles { get; set; } = new List<Article>();
}

public class SubCategory : BaseAuditableEntity
{
    public Guid CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;

    public Category Category { get; set; } = null!;
    public ICollection<Article> Articles { get; set; } = new List<Article>();
}

public class Group : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public ICollection<Article> Articles { get; set; } = new List<Article>();
}

public class ColorMaster : BaseAuditableEntity
{
    public string ColorName { get; set; } = string.Empty;
    public string? ColorCode { get; set; }
}

public class FootwearDetail
{
    public Guid FootwearDetailId { get; set; }
    public Guid ArticleId { get; set; }
    public string? Last { get; set; }
    public string? UpperLeather { get; set; }
    public string? LiningLeather { get; set; }
    public string? Sole { get; set; }
    public int? SizeRunFrom { get; set; }
    public int? SizeRunTo { get; set; }

    public Article Article { get; set; } = null!;
}

public class LeatherGoodsDetail
{
    public Guid LeatherGoodsDetailId { get; set; }
    public Guid ArticleId { get; set; }
    public string? Dimensions { get; set; }
    public string? Security { get; set; }

    public Article Article { get; set; } = null!;
}

public class ArticleSize : BaseAuditableEntity
{
    public Guid ArticleId { get; set; }
    public int EuroSize { get; set; }
    public decimal? UKSize { get; set; }
    public decimal? USSize { get; set; }
    public string? EANCode { get; set; }
    public decimal? MRP { get; set; }

    public Article Article { get; set; } = null!;
}
