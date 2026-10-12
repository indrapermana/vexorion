using Microsoft.AspNetCore.Mvc;

namespace VexorionERP.Services;

public class ServiceResult<T>
{
    private ServiceResult(bool succeeded, T? value, int? statusCode, ValidationProblemDetails? validation, string? errorMessage, string? errorCode)
    {
        Succeeded = succeeded;
        Value = value;
        StatusCode = statusCode;
        Validation = validation;
        ErrorMessage = errorMessage;
        ErrorCode = errorCode;
    }

    public bool Succeeded { get; }
    public T? Value { get; }
    public int? StatusCode { get; }
    public ValidationProblemDetails? Validation { get; }
    public string? ErrorMessage { get; }
    public string? ErrorCode { get; }

    public static ServiceResult<T> Success(T value) => new(true, value, null, null, null, null);

    public static ServiceResult<T> Failure(int statusCode, string errorMessage, string? errorCode = null) =>
        new(false, default, statusCode, null, errorMessage, errorCode);

    public static ServiceResult<T> ValidationFailure(IDictionary<string, string[]> errors) =>
        new(false, default, 400, new ValidationProblemDetails(errors), null, "validation.failed");
}
