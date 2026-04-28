using System.ComponentModel.DataAnnotations;
using VexorionERP.Database;

namespace VexorionERP.Services;

public abstract class BaseService
{
	protected readonly ICurrentTenantProvider CurrentTenantProvider;

	protected BaseService(ICurrentTenantProvider currentTenantProvider)
	{
		CurrentTenantProvider = currentTenantProvider ?? throw new ArgumentNullException(nameof(currentTenantProvider));
	}

	protected Guid TenantId => CurrentTenantProvider.TenantId ?? throw new InvalidOperationException("Tenant ID is not available.");

	protected bool HasTenantContext => CurrentTenantProvider.TenantId.HasValue;

	protected Guid? TryGetTenantId() => CurrentTenantProvider.TenantId;

	protected static bool Validate<T>(T obj, out Exception? exception)
	{
		ArgumentNullException.ThrowIfNull(obj);

		var validationContext = new ValidationContext(obj);
		var validationResults = new List<ValidationResult>();
		var result = Validator.TryValidateObject(obj, validationContext, validationResults, true);

		exception = validationResults is not null && validationResults.Count > 0 ?
			new Exception(string.Join(Environment.NewLine, validationResults.Select(x => x.ErrorMessage))) : null;
		return result;
	}

	protected static bool Validate<T>(T obj, out Dictionary<string, string[]> errors)
	{
		ArgumentNullException.ThrowIfNull(obj);

		var validationContext = new ValidationContext(obj);
		var validationResults = new List<ValidationResult>();
		var isValid = Validator.TryValidateObject(obj, validationContext, validationResults, true);

		errors = validationResults
			.Where(r => !string.IsNullOrWhiteSpace(r.ErrorMessage))
			.SelectMany(r => (r.MemberNames?.Any() == true ? r.MemberNames : [string.Empty])
				.Select(member => new { member, error = r.ErrorMessage! }))
			.GroupBy(x => x.member)
			.ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray());

		return isValid;
	}
}
