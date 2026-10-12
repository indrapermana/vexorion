using Microsoft.AspNetCore.Http;
using Xunit;

namespace VexorionERP.Web.Tests;

public class ApiProblemDetailsFactoryTests
{
    [Theory]
    [InlineData(400, "request.invalid")]
    [InlineData(401, "auth.authentication_required")]
    [InlineData(403, "auth.permission_denied")]
    [InlineData(404, "resource.not_found")]
    [InlineData(409, "resource.conflict")]
    [InlineData(413, "request.payload_too_large")]
    [InlineData(422, "request.unprocessable")]
    [InlineData(429, "request.rate_limited")]
    [InlineData(500, "server.unexpected_error")]
    [InlineData(507, "storage.quota_exceeded")]
    public void Create_ReturnsStableContractForSupportedStatusCodes(int statusCode, string expectedCode)
    {
        var context = new DefaultHttpContext
        {
            TraceIdentifier = "trace-contract-test"
        };
        context.Request.Path = "/api/test";

        var problem = ApiProblemDetailsFactory.Create(context, statusCode);

        Assert.Equal(statusCode, problem.Status);
        Assert.False(string.IsNullOrWhiteSpace(problem.Title));
        Assert.False(string.IsNullOrWhiteSpace(problem.Detail));
        Assert.Equal("/api/test", problem.Instance);
        Assert.Equal(expectedCode, problem.Extensions["code"]);
        Assert.Equal("trace-contract-test", problem.Extensions["traceId"]);
    }

    [Fact]
    public void Create_PreservesSafeBusinessDetailAndExplicitCode()
    {
        var context = new DefaultHttpContext { TraceIdentifier = "trace-business-test" };

        var problem = ApiProblemDetailsFactory.Create(
            context,
            StatusCodes.Status409Conflict,
            "Insufficient on-hand stock. Available: 2; required: 3.",
            "inventory.insufficient_stock");

        Assert.Equal("Insufficient on-hand stock. Available: 2; required: 3.", problem.Detail);
        Assert.Equal("inventory.insufficient_stock", problem.Extensions["code"]);
    }
}
