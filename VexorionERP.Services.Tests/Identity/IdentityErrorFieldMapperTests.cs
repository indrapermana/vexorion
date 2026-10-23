using Microsoft.AspNetCore.Identity;
using Xunit;

namespace VexorionERP.Services;

public class IdentityErrorFieldMapperTests
{
    [Fact]
    public void ToFieldErrors_GroupsIdentityErrorsUnderTheRequestFieldNames()
    {
        var errors = new[]
        {
            new IdentityError { Code = "PasswordRequiresDigit", Description = "Passwords must have at least one digit." },
            new IdentityError { Code = "PasswordRequiresUpper", Description = "Passwords must have at least one uppercase." },
            new IdentityError { Code = "DuplicateUserName", Description = "Username taken." },
            new IdentityError { Code = "DuplicateEmail", Description = "Email taken." },
        };

        var result = IdentityErrorFieldMapper.ToFieldErrors(errors, "AdminPassword", "AdminUserName", "AdminEmail");

        Assert.Equal(2, result["AdminPassword"].Length);
        Assert.Single(result["AdminUserName"]);
        Assert.Single(result["AdminEmail"]);
    }
}
