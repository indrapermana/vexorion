using Mapster;
using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public abstract class BaseCommandService<T> : BaseService, ICommandService<T>
    where T : class
{
    public BaseCommandService(ICurrentTenantProvider currentTenantProvider) : base(currentTenantProvider)
    {
    }

    public virtual async Task<ServiceResult<IEntityResponse<T>>> CreateAsync(ICreateInput<T> request, AppDbContext dbContext, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request, nameof(request));
        ArgumentNullException.ThrowIfNull(dbContext, nameof(dbContext));

        if (RequiresTenantContext() && !HasTenantContext)
        {
            return ServiceResult<IEntityResponse<T>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        if (!ValidateAddInput(request, out IDictionary<string, string[]>? errors, out string? errorMessage))
        {
            if (errors is not null && errors.Count > 0)
            {
                return ServiceResult<IEntityResponse<T>>.ValidationFailure(errors);
            }

            return ServiceResult<IEntityResponse<T>>.Failure(StatusCodes.Status400BadRequest, errorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var createBusinessRule = await ValidateCreateBusinessRulesAsync(request, dbContext, cancellationToken);
        if (createBusinessRule is not null)
        {
            return createBusinessRule;
        }

        T created = await AddProcessAsync(request, dbContext, cancellationToken);

        if (created is null)
        {
            return ServiceResult<IEntityResponse<T>>.Failure(StatusCodes.Status500InternalServerError, "Failed to create entity");
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<IEntityResponse<T>>.Success(BuildEntityResponse(created));
    }

    protected virtual async Task<T> AddProcessAsync(ICreateInput<T> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        T created = await GetAddToDbObjectAsync(input, context, cancellationToken);

        if (created is null)
        {
            return default!;
        }

        if (created is EntityBase entity && entity.Id == Guid.Empty)
        {
            entity.Id = Guid.NewGuid();
        }

        if (created is ITenantEntity tenantEntity)
        {
            tenantEntity.TenantId = TenantId;
        }

        if (created is IEntityTraceability traceability)
        {
            traceability.CreatedAtUtc = DateTime.UtcNow;
            traceability.UpdatedAtUtc = DateTime.UtcNow;
        }

        await context.Set<T>().AddAsync(created, cancellationToken);

        return created;
    }

    protected virtual bool ValidateAddInput(ICreateInput<T> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        var isValid = Validate(input, out Dictionary<string, string[]> validationErrors);
        errors = validationErrors.Count > 0 ? validationErrors : null;
        errorMessage = null;
        return isValid;
    }

    protected virtual Task<ServiceResult<IEntityResponse<T>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<T> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<ServiceResult<IEntityResponse<T>>?>(null);
    }

    public virtual Task<T> GetAddToDbObjectAsync(ICreateInput<T> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(input.Adapt<T>());
    }

    public virtual async Task<ServiceResult<IEntityResponse<T>>> UpdateAsync(Guid id, IUpdateInput<T> request, AppDbContext dbContext, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request, nameof(request));
        ArgumentNullException.ThrowIfNull(dbContext, nameof(dbContext));

        if (RequiresTenantContext() && !HasTenantContext)
        {
            return ServiceResult<IEntityResponse<T>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        if (!ValidateUpdateInput(request, out IDictionary<string, string[]>? errors, out string? errorMessage))
        {
            if (errors is not null && errors.Count > 0)
            {
                return ServiceResult<IEntityResponse<T>>.ValidationFailure(errors);
            }

            return ServiceResult<IEntityResponse<T>>.Failure(StatusCodes.Status400BadRequest, errorMessage ?? Errors.ERR_UNKNOWN_ERROR);
        }

        var updateBusinessRule = await ValidateUpdateBusinessRulesAsync(id, request, dbContext, cancellationToken);
        if (updateBusinessRule is not null)
        {
            return updateBusinessRule;
        }

        T updated = await UpdateProcessAsync(id, request, dbContext, cancellationToken);

        if (updated is null)
        {
            return ServiceResult<IEntityResponse<T>>.Failure(StatusCodes.Status404NotFound, GetNotFoundMessage());
        }

        var updateSideEffects = await ProcessUpdateSideEffectsAsync(id, request, updated, dbContext, cancellationToken);
        if (updateSideEffects is not null)
        {
            return updateSideEffects;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<IEntityResponse<T>>.Success(BuildEntityResponse(updated));
    }

    protected virtual bool ValidateUpdateInput(IUpdateInput<T> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        var isValid = Validate(input, out Dictionary<string, string[]> validationErrors);
        errors = validationErrors.Count > 0 ? validationErrors : null;
        errorMessage = null;
        return isValid;
    }

    protected virtual Task<ServiceResult<IEntityResponse<T>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<T> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<ServiceResult<IEntityResponse<T>>?>(null);
    }

    protected virtual async Task<T> UpdateProcessAsync(Guid id, IUpdateInput<T> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        T updated = await GetUpdatedDbObjectAsync(id, input, context, cancellationToken);

        if (updated is null)
        {
            return default!;
        }

        if (context.Entry(updated).State == Microsoft.EntityFrameworkCore.EntityState.Modified && updated is IEntityTraceability traceability)
        {
            traceability.UpdatedAtUtc = DateTime.UtcNow;
        }

        return updated;
    }

    protected virtual Task<ServiceResult<IEntityResponse<T>>?> ProcessUpdateSideEffectsAsync(
        Guid id,
        IUpdateInput<T> input,
        T updated,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<ServiceResult<IEntityResponse<T>>?>(null);
    }

    protected virtual IEntityResponse<T> BuildEntityResponse(T entity)
    {
        return AdaptEntityResponse(entity);
    }

    protected abstract Task<T> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<T> input, AppDbContext context,
        CancellationToken cancellationToken = default);

    public virtual async Task<ServiceResult<bool>> DeleteAsync(Guid id, AppDbContext dbContext, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext, nameof(dbContext));

        if (RequiresTenantContext() && !HasTenantContext)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var deleteBusinessRule = await ValidateDeleteBusinessRulesAsync(id, dbContext, cancellationToken);
        if (deleteBusinessRule is not null)
        {
            return deleteBusinessRule;
        }

        T deleted = await DeleteProcessAsync(id, dbContext, cancellationToken);

        if (deleted is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, GetNotFoundMessage());
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<bool>.Success(true);
    }

    protected virtual async Task<T> DeleteProcessAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        T deleted = await GetDeleteObjectAsync(id, context, cancellationToken);

        if (deleted is null)
        {
            return default!;
        }

        context.Set<T>().Remove(deleted);

        return deleted;
    }

    protected abstract Task<T> GetDeleteObjectAsync(Guid id, AppDbContext context,
        CancellationToken cancellationToken = default);

    protected virtual Task<ServiceResult<bool>?> ValidateDeleteBusinessRulesAsync(
        Guid id,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<ServiceResult<bool>?>(null);
    }

    protected virtual bool RequiresTenantContext() => typeof(ITenantEntity).IsAssignableFrom(typeof(T));

    protected virtual string GetNotFoundMessage() => $"{typeof(T).Name} not found.";
}