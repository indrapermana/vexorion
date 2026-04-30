using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProductIdentifiersQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProductIdentifiersQuery, ServiceResult<IReadOnlyCollection<ProductIdentifierListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProductIdentifierListItemResponse>>> Handle(
        GetProductIdentifiersQuery request, CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();
        var tenantId = tenantProvider.TenantId;

        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<ProductIdentifierListItemResponse>>.Failure(
                StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var items = await dbContext.ProductIdentifiers
            .GetByTenant(tenantId.Value)
            .Where(x => x.ProductId == request.ProductId)
            .AsNoTracking()
            .OrderBy(x => x.CodeType)
            .ThenBy(x => x.CodeValue)
            .ToListAsync(cancellationToken);

        var response = items.Adapt<IReadOnlyCollection<ProductIdentifierListItemResponse>>();
        return ServiceResult<IReadOnlyCollection<ProductIdentifierListItemResponse>>.Success(response);
    }
}
