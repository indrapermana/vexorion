using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProjectCategoryCommandService(ICurrentTenantProvider currentTenantProvider)
    : BaseCommandService<ProjectCategory>(currentTenantProvider)
{
    protected override async Task<ServiceResult<IEntityResponse<ProjectCategory>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<ProjectCategory> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (CreateProjectCategoryRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var normalizedCode = NormalizeCode(request.Code);
        var normalizedName = NormalizeName(request.Name);

        var codeExists = await context.ProjectCategories
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Code == normalizedCode, cancellationToken);

        if (codeExists)
        {
            return ServiceResult<IEntityResponse<ProjectCategory>>.Failure(
                StatusCodes.Status409Conflict,
                "A project category with the same code already exists.");
        }

        var nameExists = await context.ProjectCategories
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Name.ToUpper() == normalizedName.ToUpper(), cancellationToken);

        if (nameExists)
        {
            return ServiceResult<IEntityResponse<ProjectCategory>>.Failure(
                StatusCodes.Status409Conflict,
                "A project category with the same name already exists.");
        }

        return null;
    }

    protected override async Task<ServiceResult<IEntityResponse<ProjectCategory>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<ProjectCategory> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (UpdateProjectCategoryRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var normalizedCode = NormalizeCode(request.Code);
        var normalizedName = NormalizeName(request.Name);

        var codeExists = await context.ProjectCategories
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Code == normalizedCode && x.Id != id, cancellationToken);

        if (codeExists)
        {
            return ServiceResult<IEntityResponse<ProjectCategory>>.Failure(
                StatusCodes.Status409Conflict,
                "A project category with the same code already exists.");
        }

        var nameExists = await context.ProjectCategories
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id && x.Name.ToUpper() == normalizedName.ToUpper(), cancellationToken);

        if (nameExists)
        {
            return ServiceResult<IEntityResponse<ProjectCategory>>.Failure(
                StatusCodes.Status409Conflict,
                "A project category with the same name already exists.");
        }

        return null;
    }

    public override Task<ProjectCategory> GetAddToDbObjectAsync(
        ICreateInput<ProjectCategory> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (CreateProjectCategoryRequest)input;
        var entity = new ProjectCategory
        {
            Code = NormalizeCode(request.Code),
            Name = NormalizeName(request.Name),
            Description = NormalizeOptional(request.Description)
        };

        return Task.FromResult(entity);
    }

    protected override async Task<ProjectCategory> GetUpdatedDbObjectAsync(
        Guid id,
        IUpdateInput<ProjectCategory> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (UpdateProjectCategoryRequest)input;
        var entity = await context.ProjectCategories
            .GetByTenant(TenantId)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            return null!;
        }

        entity.Code = NormalizeCode(request.Code);
        entity.Name = NormalizeName(request.Name);
        entity.Description = NormalizeOptional(request.Description);
        entity.IsActive = request.IsActive;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        return entity;
    }

    protected override async Task<ProjectCategory> GetDeleteObjectAsync(
        Guid id,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var entity = await context.ProjectCategories
            .GetByTenant(TenantId)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return entity!;
    }

    private static string NormalizeCode(string code) => code.Trim().ToUpperInvariant();

    private static string NormalizeName(string name) => name.Trim();

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
