using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class CreateCreditNoteForSalesInvoiceCommandHandler(
    SalesInvoiceCommandService commandService) : IRequestHandler<CreateCreditNoteForSalesInvoiceCommand, ServiceResult<SalesInvoiceDetailsResponse>>
{
    public ValueTask<ServiceResult<SalesInvoiceDetailsResponse>> Handle(
        CreateCreditNoteForSalesInvoiceCommand request,
        CancellationToken cancellationToken)
    {
        return new ValueTask<ServiceResult<SalesInvoiceDetailsResponse>>(
            commandService.CreateCreditNoteAsync(request.OriginalInvoiceId, request.Request, cancellationToken));
    }
}
