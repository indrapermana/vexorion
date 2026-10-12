using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace VexorionERP;

public static class ApiProblemDetailsFactory
{
    public static ValidationProblemDetails CreateValidation(HttpContext httpContext, ModelStateDictionary modelState)
    {
        var problem = new ValidationProblemDetails(modelState)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Validation failed",
            Detail = "One or more fields contain invalid values. Review the highlighted fields and try again.",
            Instance = httpContext.Request.Path,
            Type = "https://httpstatuses.com/400"
        };

        AddExtensions(problem, httpContext, "validation.failed");
        return problem;
    }

    public static ValidationProblemDetails EnrichValidation(HttpContext httpContext, ValidationProblemDetails problem)
    {
        problem.Status = StatusCodes.Status400BadRequest;
        problem.Title = "Validation failed";
        problem.Detail = "One or more fields contain invalid values. Review the highlighted fields and try again.";
        problem.Instance = httpContext.Request.Path;
        problem.Type = "https://httpstatuses.com/400";
        AddExtensions(problem, httpContext, "validation.failed");
        return problem;
    }

    public static ProblemDetails Create(
        HttpContext httpContext,
        int statusCode,
        string? detail = null,
        string? code = null)
    {
        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = GetTitle(statusCode),
            Detail = string.IsNullOrWhiteSpace(detail) ? GetDefaultDetail(statusCode) : detail,
            Instance = httpContext.Request.Path,
            Type = $"https://httpstatuses.com/{statusCode}"
        };

        AddExtensions(problem, httpContext, code ?? GetDefaultCode(statusCode));
        return problem;
    }

    private static void AddExtensions(ProblemDetails problem, HttpContext httpContext, string code)
    {
        problem.Extensions["code"] = code;
        problem.Extensions["traceId"] = httpContext.TraceIdentifier;
    }

    public static string GetDefaultCode(int statusCode) => statusCode switch
    {
        StatusCodes.Status400BadRequest => "request.invalid",
        StatusCodes.Status401Unauthorized => "auth.authentication_required",
        StatusCodes.Status403Forbidden => "auth.permission_denied",
        StatusCodes.Status404NotFound => "resource.not_found",
        StatusCodes.Status409Conflict => "resource.conflict",
        StatusCodes.Status413PayloadTooLarge => "request.payload_too_large",
        StatusCodes.Status422UnprocessableEntity => "request.unprocessable",
        StatusCodes.Status429TooManyRequests => "request.rate_limited",
        StatusCodes.Status500InternalServerError => "server.unexpected_error",
        StatusCodes.Status507InsufficientStorage => "storage.quota_exceeded",
        _ => "request.failed"
    };

    private static string GetTitle(int statusCode) => statusCode switch
    {
        StatusCodes.Status400BadRequest => "Invalid request",
        StatusCodes.Status401Unauthorized => "Authentication required",
        StatusCodes.Status403Forbidden => "Permission denied",
        StatusCodes.Status404NotFound => "Resource not found",
        StatusCodes.Status409Conflict => "Request conflict",
        StatusCodes.Status413PayloadTooLarge => "File or request too large",
        StatusCodes.Status422UnprocessableEntity => "Request could not be processed",
        StatusCodes.Status429TooManyRequests => "Too many requests",
        StatusCodes.Status500InternalServerError => "Unexpected server error",
        StatusCodes.Status507InsufficientStorage => "Storage quota exceeded",
        _ => "Request failed"
    };

    private static string GetDefaultDetail(int statusCode) => statusCode switch
    {
        StatusCodes.Status401Unauthorized => "Sign in is required to continue.",
        StatusCodes.Status403Forbidden => "You do not have permission to perform this action.",
        StatusCodes.Status404NotFound => "The requested resource could not be found.",
        StatusCodes.Status409Conflict => "The request conflicts with the current state of the resource.",
        StatusCodes.Status429TooManyRequests => "Too many requests were sent. Wait briefly and try again.",
        StatusCodes.Status500InternalServerError => "An unexpected error occurred. Use the trace ID when contacting support.",
        _ => "The request could not be completed."
    };
}
