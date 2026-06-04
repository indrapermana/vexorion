using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetConsultantsQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetConsultantsQuery, Consultant, ConsultantListItemResponse>(serviceProvider);
