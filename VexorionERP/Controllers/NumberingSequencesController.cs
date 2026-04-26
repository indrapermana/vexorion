using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Finance.Numbering;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/numbering-sequences")]
[Authorize]
public class NumberingSequencesController(
    INumberingService numberingService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<IReadOnlyCollection<NumberingSequenceResponse>>> GetAll()
    {
        var result = await numberingService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPut]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<NumberingSequenceResponse>> Upsert([FromBody] UpsertNumberingSequenceRequest request)
    {
        var result = await numberingService.UpsertAsync(request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
