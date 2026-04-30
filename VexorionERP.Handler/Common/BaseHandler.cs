using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public abstract class BaseHandler<TEntity>(IServiceProvider serviceProvider)
    where TEntity : class
{
    protected AppDbContext DbContext => serviceProvider.GetRequiredService<AppDbContext>();

    protected IQueryService<TEntity> QueryService => serviceProvider.GetRequiredService<IQueryService<TEntity>>();

    protected ICommandService<TEntity> CommandService => serviceProvider.GetRequiredService<ICommandService<TEntity>>();

    protected static ServiceResult<TDetails> MapDetails<TDetails>(ServiceResult<IEntityResponse<TEntity>> result)
    {
        if (result.Succeeded)
        {
            if (result.Value is TDetails details)
            {
                return ServiceResult<TDetails>.Success(details);
            }

            return ServiceResult<TDetails>.Success(result.Value!.Adapt<TDetails>());
        }

        if (result.Validation is not null)
            return ServiceResult<TDetails>.ValidationFailure(
                result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));

        return ServiceResult<TDetails>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    protected static ServiceResult<IReadOnlyCollection<TListItem>> MapList<TListItem>(
        ServiceResult<IReadOnlyCollection<IEntityListResponse<TEntity>>> result)
    {
        if (result.Succeeded)
        {
            var source = result.Value!;

            // Query services already return concrete list-item DTOs behind the interface.
            // Preserve those instances to avoid losing values when remapping from the interface shape.
            var casted = source.OfType<TListItem>().ToList();
            if (casted.Count == source.Count)
            {
                return ServiceResult<IReadOnlyCollection<TListItem>>.Success(casted);
            }

            return ServiceResult<IReadOnlyCollection<TListItem>>.Success(
                source.Select(item => item.Adapt<TListItem>()).ToList());
        }

        if (result.Validation is not null)
            return ServiceResult<IReadOnlyCollection<TListItem>>.ValidationFailure(
                result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));

        return ServiceResult<IReadOnlyCollection<TListItem>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}