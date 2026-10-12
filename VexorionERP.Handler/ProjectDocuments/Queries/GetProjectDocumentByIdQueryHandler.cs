using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProjectDocumentByIdQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProjectDocumentByIdQuery, ServiceResult<ProjectDocumentDetailsResponse>>
{
    public async ValueTask<ServiceResult<ProjectDocumentDetailsResponse>> Handle(
        GetProjectDocumentByIdQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();

        var tenantId = tenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<ProjectDocumentDetailsResponse>.Failure(
                StatusCodes.Status400BadRequest,
                "Tenant context is required.");
        }

        var document = await dbContext.ProjectDocuments
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.DocumentId, cancellationToken);

        if (document is null)
        {
            return ServiceResult<ProjectDocumentDetailsResponse>.Failure(
                StatusCodes.Status404NotFound,
                "Document not found.");
        }

        var canView = await ProjectDocumentAccessEvaluator.CanViewAsync(
            dbContext,
            document.Id,
            document.TenantId,
            tenantId.Value,
            DateTime.UtcNow,
            cancellationToken);

        if (!canView)
        {
            return ServiceResult<ProjectDocumentDetailsResponse>.Failure(
                StatusCodes.Status404NotFound,
                "Document not found.");
        }

        return ServiceResult<ProjectDocumentDetailsResponse>.Success(document.Adapt<ProjectDocumentDetailsResponse>());
    }
}
