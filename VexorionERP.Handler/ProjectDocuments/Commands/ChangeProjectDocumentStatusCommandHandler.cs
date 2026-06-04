using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class ChangeProjectDocumentStatusCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<ChangeProjectDocumentStatusCommand, ServiceResult<ProjectDocumentDetailsResponse>>
{
    public async ValueTask<ServiceResult<ProjectDocumentDetailsResponse>> Handle(
        ChangeProjectDocumentStatusCommand request,
        CancellationToken cancellationToken)
    {
        var commandService = serviceProvider.GetRequiredService<ProjectDocumentCommandService>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        return await commandService.ChangeStatusAsync(
            request.DocumentId,
            request.Request,
            dbContext,
            cancellationToken);
    }
}
