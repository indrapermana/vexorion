using Microsoft.AspNetCore.Mvc;
using VexorionERP.Services;

namespace VexorionERP;

public abstract class ServiceResultControllerBase : ControllerBase
{
    protected ObjectResult ApiFailure(int statusCode, string detail, string? code = null) =>
        new(ApiProblemDetailsFactory.Create(HttpContext, statusCode, detail, code)) { StatusCode = statusCode };

    protected ActionResult ToActionResult(ServiceResult<bool> result)
    {
        if (result.Succeeded)
        {
            return NoContent();
        }

        if (result.Validation is not null)
        {
            return ValidationError(result.Validation);
        }

        return Failure(result.StatusCode, result.ErrorMessage, result.ErrorCode);
    }

    protected ActionResult<T> ToActionResult<T>(ServiceResult<T> result)
    {
        if (result.Succeeded)
        {
            return Ok(result.Value);
        }

        if (result.Validation is not null)
        {
            return ValidationError(result.Validation);
        }

        return Failure(result.StatusCode, result.ErrorMessage, result.ErrorCode);
    }

    private ObjectResult Failure(int? statusCode, string? detail, string? code)
    {
        var resolvedStatus = statusCode is >= 400 and <= 599
            ? statusCode.Value
            : StatusCodes.Status400BadRequest;
        var problem = ApiProblemDetailsFactory.Create(HttpContext, resolvedStatus, detail, code);
        return new ObjectResult(problem) { StatusCode = resolvedStatus };
    }

    private ObjectResult ValidationError(ValidationProblemDetails validation)
    {
        return new ObjectResult(ApiProblemDetailsFactory.EnrichValidation(HttpContext, validation))
        {
            StatusCode = StatusCodes.Status400BadRequest
        };
    }
}
