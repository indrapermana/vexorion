namespace VexorionERP;

public interface ITenantMemoryCache
{
    bool TryGetValue<T>(string cacheArea, string key, out T? value);
    void Set<T>(string cacheArea, string key, T value, TimeSpan ttl);
    void Remove(string cacheArea, string key);
}
