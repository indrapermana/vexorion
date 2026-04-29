using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/accounts")]
[Authorize]
public class AccountsController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<IReadOnlyCollection<AccountListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetAccountsQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{accountId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<AccountDetailsResponse>> GetById(Guid accountId)
    {
        var result = await mediator.Send(new GetAccountByIdQuery(accountId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<AccountDetailsResponse>> Create([FromBody] CreateAccountRequest request)
    {
        var result = await mediator.Send(new CreateAccountCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { accountId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{accountId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<AccountDetailsResponse>> Update(Guid accountId, [FromBody] UpdateAccountRequest request)
    {
        var result = await mediator.Send(new UpdateAccountCommand(accountId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{accountId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult> Delete(Guid accountId)
    {
        var result = await mediator.Send(new DeleteAccountCommand(accountId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
