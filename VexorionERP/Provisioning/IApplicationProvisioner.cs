namespace VexorionERP;

public interface IApplicationProvisioner
{
    Task BootstrapAsync(CancellationToken cancellationToken = default);
}
