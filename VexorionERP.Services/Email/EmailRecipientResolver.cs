namespace VexorionERP.Services;

public static class EmailRecipientResolver
{
    public static string Resolve(string address, bool redirectPlusAddressing)
    {
        if (!redirectPlusAddressing)
        {
            return address;
        }

        var at = address.LastIndexOf('@');
        if (at <= 0)
        {
            return address;
        }

        var local = address[..at];
        var plus = local.IndexOf('+');
        return plus > 0 ? local[..plus] + address[at..] : address;
    }
}
