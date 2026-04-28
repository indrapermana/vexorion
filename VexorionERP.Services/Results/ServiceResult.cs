using Microsoft.AspNetCore.Mvc;

namespace VexorionERP.Services;

public class ServiceResult<T>
{
    private ServiceResult(bool succeeded, T? value, int? statusCode, ValidationProblemDetails? validation, string? errorMessage)
    {
        Succeeded = succeeded;
        Value = value;
        StatusCode = statusCode;
        Validation = validation;
        ErrorMessage = errorMessage;
    }

    public bool Succeeded { get; }
    public T? Value { get; }
    public int? StatusCode { get; }
    public ValidationProblemDetails? Validation { get; }
    public string? ErrorMessage { get; }

    public static ServiceResult<T> Success(T value) => new(true, value, null, null, null);

    public static ServiceResult<T> Failure(int statusCode, string errorMessage) => new(false, default, statusCode, null, errorMessage);

    public static ServiceResult<T> ValidationFailure(IDictionary<string, string[]> errors) =>
        new(false, default, 400, new ValidationProblemDetails(errors), null);
}
