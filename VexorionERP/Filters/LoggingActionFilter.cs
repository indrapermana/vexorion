using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Serilog;

namespace VexorionERP.Filters;

public sealed class LoggingActionFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var controller = context.RouteData.Values["controller"];
        var action = context.RouteData.Values["action"];

        Log.Information("{Controller}.{Action} called", controller, action);

        var executed = await next();

        if (executed.Exception is { } ex && !executed.ExceptionHandled)
        {
            Log.Error(ex, "{Controller}.{Action} threw an unhandled exception", controller, action);
            return;
        }

        var statusCode = executed.Result switch
        {
            ObjectResult obj => obj.StatusCode,
            StatusCodeResult sc => sc.StatusCode,
            _ => null
        };

        if (statusCode >= 400)
        {
            Log.Error("{Controller}.{Action} responded {StatusCode}", controller, action, statusCode);
        }
    }
}
