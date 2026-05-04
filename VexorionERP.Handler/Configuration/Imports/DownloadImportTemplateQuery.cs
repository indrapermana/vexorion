using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DownloadImportTemplateQuery(string ImportType) : IRequest<ServiceResult<ImportTemplateResponse>>;
