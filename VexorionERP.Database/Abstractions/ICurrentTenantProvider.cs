namespace VexorionERP.Database.Abstractions;

public interface ICurrentTenantProvider
{
    Guid? TenantId { get; }
}