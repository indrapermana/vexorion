using Microsoft.AspNetCore.Mvc;
using VexorionERP.Services.Results;

namespace VexorionERP.Controllers;

public abstract class ServiceResultControllerBase : ControllerBase
{
    protected ActionResult ToActionResult(ServiceResult<bool> result)
    {
        if (result.Succeeded)
        {
            return NoContent();
        }

        if (result.Validation is not null)
        {
            return BadRequest(result.Validation);
        }

        return result.StatusCode switch
        {
            400 => BadRequest(new { message = result.ErrorMessage }),
            401 => Unauthorized(),
            403 => Forbid(),
            404 => NotFound(),
            409 => Conflict(new { message = result.ErrorMessage }),
            _ => BadRequest(new { message = result.ErrorMessage })
        };
    }

    protected ActionResult<T> ToActionResult<T>(ServiceResult<T> result)
    {
        if (result.Succeeded)
        {
            return Ok(result.Value);
        }

        if (result.Validation is not null)
        {
            return BadRequest(result.Validation);
        }

        return result.StatusCode switch
        {
            400 => BadRequest(new { message = result.ErrorMessage }),
            401 => Unauthorized(),
            403 => Forbid(),
            404 => NotFound(),
            409 => Conflict(new { message = result.ErrorMessage }),
            _ => BadRequest(new { message = result.ErrorMessage })
        };
    }
}