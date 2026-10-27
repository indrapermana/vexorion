using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record ValidateImportRowsCommand(ValidateImportRowsRequest Request) : IRequest<ServiceResult<ImportValidationResultResponse>>;