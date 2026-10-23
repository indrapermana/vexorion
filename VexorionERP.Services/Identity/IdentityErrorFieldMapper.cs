using Microsoft.AspNetCore.Identity;

namespace VexorionERP.Services;

internal static class IdentityErrorFieldMapper
{
    /// <summary>Groups Identity errors by the request field they belong to so clients can highlight the right input.</summary>
    public static Dictionary<string, string[]> ToFieldErrors(
        IEnumerable<IdentityError> errors,
        string passwordField,
        string userNameField,
        string emailField)
    {
        return errors
            .GroupBy(error => error.Code switch
            {
                var code when code.StartsWith("Password", StringComparison.Ordinal) => passwordField,
                "DuplicateUserName" or "InvalidUserName" => userNameField,
                "DuplicateEmail" or "InvalidEmail" => emailField,
                var code => code
            })
            .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray());
    }
}
