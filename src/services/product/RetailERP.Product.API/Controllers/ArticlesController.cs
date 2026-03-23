using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RetailERP.Product.Application.Interfaces;
using RetailERP.Shared.Contracts.Common;
using RetailERP.Shared.Contracts.Product;

namespace RetailERP.Product.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ArticlesController : ControllerBase
{
    private readonly IArticleService _articleService;

    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")?.Value
        ?? throw new UnauthorizedAccessException("Tenant not found in token"));
    private Guid UserId => Guid.Parse(User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException());

    public ArticlesController(IArticleService articleService)
    {
        _articleService = articleService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<ArticleDto>>>> GetAll(
        [FromQuery] PagedQuery query,
        [FromQuery] Guid? brandId,
        [FromQuery] Guid? segmentId,
        [FromQuery] Guid? categoryId,
        [FromQuery] Guid? genderId,
        [FromQuery] Guid? seasonId,
        [FromQuery] bool? isActive,
        CancellationToken ct)
    {
        var result = await _articleService.GetPagedAsync(
            TenantId, query, brandId, segmentId, categoryId, genderId, seasonId, isActive, ct);
        return Ok(ApiResponse<PagedResult<ArticleDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ArticleDto>>> GetById(Guid id, CancellationToken ct)
    {
        var article = await _articleService.GetByIdAsync(id, TenantId, ct);
        return Ok(ApiResponse<ArticleDto>.Ok(article));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ArticleDto>>> Create(
        [FromBody] CreateArticleRequest request, CancellationToken ct)
    {
        var article = await _articleService.CreateAsync(TenantId, request, UserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = article.ArticleId },
            ApiResponse<ArticleDto>.Ok(article, "Article created successfully"));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ArticleDto>>> Update(
        Guid id, [FromBody] UpdateArticleRequest request, CancellationToken ct)
    {
        var article = await _articleService.UpdateAsync(id, TenantId, request, ct);
        return Ok(ApiResponse<ArticleDto>.Ok(article, "Article updated successfully"));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        await _articleService.DeleteAsync(id, TenantId, ct);
        return Ok(ApiResponse<bool>.Ok(true, "Article deleted"));
    }
}
