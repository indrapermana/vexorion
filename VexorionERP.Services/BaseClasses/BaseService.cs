using System.ComponentModel.DataAnnotations;
using System.Collections.Concurrent;
using System.Reflection;
using VexorionERP.Contracts;
using VexorionERP.Database;

namespace VexorionERP.Services;

public abstract class BaseService
{
	private static readonly ConcurrentDictionary<Type, Type> EntityListResponseTypeCache = new();
	private static readonly ConcurrentDictionary<Type, Type> EntityResponseTypeCache = new();

	protected readonly ICurrentTenantProvider CurrentTenantProvider;

	protected BaseService(ICurrentTenantProvider currentTenantProvider)
	{
		CurrentTenantProvider = currentTenantProvider ?? throw new ArgumentNullException(nameof(currentTenantProvider));
	}

	protected Guid TenantId => CurrentTenantProvider.TenantId ?? throw new InvalidOperationException("Tenant ID is not available.");

	protected bool HasTenantContext => CurrentTenantProvider.TenantId.HasValue;

	protected Guid? TryGetTenantId() => CurrentTenantProvider.TenantId;

	protected static IReadOnlyCollection<IEntityListResponse<TEntity>> AdaptEntityListResponses<TEntity>(IEnumerable<TEntity> entities)
		where TEntity : class
	{
		ArgumentNullException.ThrowIfNull(entities);

		var responseType = EntityListResponseTypeCache.GetOrAdd(typeof(TEntity), ResolveEntityListResponseType<TEntity>);
		var sourceProperties = typeof(TEntity)
			.GetProperties(BindingFlags.Public | BindingFlags.Instance)
			.Where(p => p.CanRead)
			.ToDictionary(p => p.Name, p => p, StringComparer.OrdinalIgnoreCase);

		var targetProperties = responseType
			.GetProperties(BindingFlags.Public | BindingFlags.Instance)
			.Where(p => p.CanWrite)
			.ToArray();

		return entities
			.Select(entity =>
			{
				var mapped = Activator.CreateInstance(responseType)
					?? throw new InvalidOperationException($"Unable to create response type {responseType.Name}.");

				foreach (var targetProperty in targetProperties)
				{
					if (!sourceProperties.TryGetValue(targetProperty.Name, out var sourceProperty))
					{
						continue;
					}

					if (!targetProperty.PropertyType.IsAssignableFrom(sourceProperty.PropertyType))
					{
						continue;
					}

					targetProperty.SetValue(mapped, sourceProperty.GetValue(entity));
				}

				return mapped;
			})
			.Cast<IEntityListResponse<TEntity>>()
			.ToList();
	}

	protected static IEntityResponse<TEntity> AdaptEntityResponse<TEntity>(TEntity entity)
		where TEntity : class
	{
		ArgumentNullException.ThrowIfNull(entity);

		var responseType = EntityResponseTypeCache.GetOrAdd(typeof(TEntity), ResolveEntityResponseType<TEntity>);
		var sourceProperties = typeof(TEntity)
			.GetProperties(BindingFlags.Public | BindingFlags.Instance)
			.Where(p => p.CanRead)
			.ToDictionary(p => p.Name, p => p, StringComparer.OrdinalIgnoreCase);

		var targetProperties = responseType
			.GetProperties(BindingFlags.Public | BindingFlags.Instance)
			.Where(p => p.CanWrite)
			.ToArray();

		var mapped = Activator.CreateInstance(responseType)
			?? throw new InvalidOperationException($"Unable to create response type {responseType.Name}.");

		foreach (var targetProperty in targetProperties)
		{
			if (!sourceProperties.TryGetValue(targetProperty.Name, out var sourceProperty))
			{
				continue;
			}

			if (!targetProperty.PropertyType.IsAssignableFrom(sourceProperty.PropertyType))
			{
				continue;
			}

			targetProperty.SetValue(mapped, sourceProperty.GetValue(entity));
		}

		return (IEntityResponse<TEntity>)mapped;
	}

	private static Type ResolveEntityListResponseType<TEntity>(Type _)
		where TEntity : class
	{
		var expectedInterface = typeof(IEntityListResponse<TEntity>);
		var contractsAssembly = typeof(IEntityListResponse<>).Assembly;

		var responseType = contractsAssembly
			.GetTypes()
			.FirstOrDefault(type =>
				type.IsClass &&
				!type.IsAbstract &&
				expectedInterface.IsAssignableFrom(type) &&
				type.Name.EndsWith("ListItemResponse", StringComparison.Ordinal));

		if (responseType is null)
		{
			throw new InvalidOperationException($"No list response type implementing {expectedInterface.Name} was found in contracts assembly.");
		}

		return responseType;
	}

	private static Type ResolveEntityResponseType<TEntity>(Type _)
		where TEntity : class
	{
		var expectedInterface = typeof(IEntityResponse<TEntity>);
		var contractsAssembly = typeof(IEntityResponse<>).Assembly;

		var responseType = contractsAssembly
			.GetTypes()
			.FirstOrDefault(type =>
				type.IsClass &&
				!type.IsAbstract &&
				expectedInterface.IsAssignableFrom(type) &&
				type.Name.EndsWith("DetailsResponse", StringComparison.Ordinal));

		if (responseType is null)
		{
			throw new InvalidOperationException($"No details response type implementing {expectedInterface.Name} was found in contracts assembly.");
		}

		return responseType;
	}

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
