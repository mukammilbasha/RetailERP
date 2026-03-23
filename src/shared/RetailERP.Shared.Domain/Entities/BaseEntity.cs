namespace RetailERP.Shared.Domain.Entities;

public abstract class BaseEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
}

public abstract class BaseAuditableEntity : BaseEntity
{
    public bool IsActive { get; set; } = true;
}
