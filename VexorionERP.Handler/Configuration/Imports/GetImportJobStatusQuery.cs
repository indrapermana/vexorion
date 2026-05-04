using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetImportJobStatusQuery(Guid ImportJobId) : IRequest<ServiceResult<ImportJobStatusResponse>>;
