namespace VexorionERP.Database;

public interface ICurrentTenantProvider
{
    Guid? TenantId { get; }
}
