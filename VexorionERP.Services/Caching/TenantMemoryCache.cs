using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using VexorionERP.Database;

namespace VexorionERP;

public class TenantMemoryCache(
    IMemoryCache memoryCache,
    ICurrentTenantProvider currentTenantProvider,
    ILogger<TenantMemoryCache> logger) : ITenantMemoryCache
{
    public bool TryGetValue<T>(string cacheArea, string key, out T? value)
    {
        var cacheKey = BuildKey(cacheArea, key);
        if (memoryCache.TryGetValue(cacheKey, out var cached) && cached is T typedValue)
        {
            logger.LogInformation("Cache HIT: {CacheKey}", cacheKey);
            value = typedValue;
            return true;
        }

        logger.LogInformation("Cache MISS: {CacheKey}", cacheKey);
        value = default;
        return false;
    }

    public void Set<T>(string cacheArea, string key, T value, TimeSpan ttl)
    {
        var cacheKey = BuildKey(cacheArea, key);
        var options = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = ttl,
            Size = 1
        };

        memoryCache.Set(cacheKey, value, options);
        logger.LogInformation("Cache SET: {CacheKey} (TTL {TtlSeconds}s)", cacheKey, (int)ttl.TotalSeconds);
    }

    public void Remove(string cacheArea, string key)
    {
        var cacheKey = BuildKey(cacheArea, key);
        memoryCache.Remove(cacheKey);
        logger.LogInformation("Cache INVALIDATE: {CacheKey}", cacheKey);
    }

    private string BuildKey(string cacheArea, string key)
    {
        var tenantId = currentTenantProvider.TenantId?.ToString() ?? "anonymous";
        return $"tenant:{tenantId}:{cacheArea}:{key}";
    }
}
