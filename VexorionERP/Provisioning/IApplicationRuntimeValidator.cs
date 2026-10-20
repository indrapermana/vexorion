namespace VexorionERP;

public interface IApplicationRuntimeValidator
{
    Task ValidateAsync(CancellationToken cancellationToken = default);
}
