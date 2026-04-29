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
            return ServiceResult<TDetails>.Success(result.Value!.Adapt<TDetails>());

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
            return ServiceResult<IReadOnlyCollection<TListItem>>.Success(
                result.Value!.Adapt<IReadOnlyCollection<TListItem>>());

        if (result.Validation is not null)
            return ServiceResult<IReadOnlyCollection<TListItem>>.ValidationFailure(
                result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));

        return ServiceResult<IReadOnlyCollection<TListItem>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}