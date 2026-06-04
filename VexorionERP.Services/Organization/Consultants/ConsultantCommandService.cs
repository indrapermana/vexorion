using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ConsultantCommandService(ICurrentTenantProvider currentTenantProvider)
    : BaseCommandService<Consultant>(currentTenantProvider)
{
    protected override bool ValidateAddInput(ICreateInput<Consultant> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        var request = (CreateConsultantRequest)input;
        var validation = Validate(request.ConsultantNumber, request.FullName, request.Email);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateAddInput(input, out errors, out errorMessage);
    }

    protected override bool ValidateUpdateInput(IUpdateInput<Consultant> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        var request = (UpdateConsultantRequest)input;
        var validation = Validate(request.ConsultantNumber, request.FullName, request.Email);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateUpdateInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<Consultant>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<Consultant> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (CreateConsultantRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var normalizedNumber = request.ConsultantNumber.Trim().ToUpperInvariant();
        var numberExists = await context.Consultants
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.ConsultantNumber.ToUpper() == normalizedNumber, cancellationToken);

        if (numberExists)
        {
            return ServiceResult<IEntityResponse<Consultant>>.Failure(
                StatusCodes.Status409Conflict,
                "A consultant with the same number already exists.");
        }

        return null;
    }

    protected override async Task<ServiceResult<IEntityResponse<Consultant>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<Consultant> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (UpdateConsultantRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var normalizedNumber = request.ConsultantNumber.Trim().ToUpperInvariant();
        var numberExists = await context.Consultants
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id && x.ConsultantNumber.ToUpper() == normalizedNumber, cancellationToken);

        if (numberExists)
        {
            return ServiceResult<IEntityResponse<Consultant>>.Failure(
                StatusCodes.Status409Conflict,
                "A consultant with the same number already exists.");
        }

        return null;
    }

    public override async Task<Consultant> GetAddToDbObjectAsync(ICreateInput<Consultant> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var created = await base.GetAddToDbObjectAsync(input, context, cancellationToken);
        Normalize(created);
        return created;
    }

    protected override async Task<Consultant> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<Consultant> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return null!;
        }

        var request = (UpdateConsultantRequest)input;
        var consultant = await context.Consultants
            .GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (consultant is null)
        {
            return null!;
        }

        consultant.ConsultantNumber = request.ConsultantNumber;
        consultant.FullName = request.FullName;
        consultant.Email = request.Email;
        consultant.PhoneNumber = request.PhoneNumber;
        consultant.OrganizationName = request.OrganizationName;
        consultant.Specialty = request.Specialty;
        consultant.IsActive = request.IsActive;

        Normalize(consultant);
        return consultant;
    }

    protected override async Task<Consultant> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return null!;
        }

        var consultant = await context.Consultants
            .GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return consultant ?? null!;
    }

    protected override string GetNotFoundMessage() => "Consultant not found.";

    private static Dictionary<string, string[]> Validate(string consultantNumber, string fullName, string email)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(consultantNumber))
        {
            errors[nameof(CreateConsultantRequest.ConsultantNumber)] = ["Consultant number is required."];
        }

        if (string.IsNullOrWhiteSpace(fullName))
        {
            errors[nameof(CreateConsultantRequest.FullName)] = ["Full name is required."];
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            errors[nameof(CreateConsultantRequest.Email)] = ["Email is required."];
        }

        return errors;
    }

    private static void Normalize(Consultant consultant)
    {
        consultant.ConsultantNumber = consultant.ConsultantNumber.Trim().ToUpperInvariant();
        consultant.FullName = consultant.FullName.Trim();
        consultant.Email = consultant.Email.Trim();
        consultant.PhoneNumber = string.IsNullOrWhiteSpace(consultant.PhoneNumber) ? null : consultant.PhoneNumber.Trim();
        consultant.OrganizationName = string.IsNullOrWhiteSpace(consultant.OrganizationName) ? null : consultant.OrganizationName.Trim();
        consultant.Specialty = string.IsNullOrWhiteSpace(consultant.Specialty) ? null : consultant.Specialty.Trim();
    }
}
