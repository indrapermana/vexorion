namespace VexorionERP.Models.Identity;

public static class AppPermissions
{
    public static class Users
    {
        public const string View = "users.view";
        public const string Manage = "users.manage";
    }

    public static class Roles
    {
        public const string View = "roles.view";
        public const string Manage = "roles.manage";
    }

    public static class Customers
    {
        public const string View = "customers.view";
        public const string Manage = "customers.manage";
    }

    public static class Suppliers
    {
        public const string View = "suppliers.view";
        public const string Manage = "suppliers.manage";
    }

    public static class Products
    {
        public const string View = "products.view";
        public const string Manage = "products.manage";
    }

    public static class Organization
    {
        public const string View = "organization.view";
        public const string Manage = "organization.manage";
    }

    public static class Sales
    {
        public const string View = "sales.view";
        public const string Manage = "sales.manage";
    }

    public static class Purchasing
    {
        public const string View = "purchasing.view";
        public const string Manage = "purchasing.manage";
    }

    public static class Inventory
    {
        public const string View = "inventory.view";
        public const string Manage = "inventory.manage";
    }

    public static class Billing
    {
        public const string View = "billing.view";
        public const string Manage = "billing.manage";
    }

    public static IReadOnlyCollection<string> All { get; } =
    [
        Users.View,
        Users.Manage,
        Roles.View,
        Roles.Manage,
        Customers.View,
        Customers.Manage,
        Suppliers.View,
        Suppliers.Manage,
        Products.View,
        Products.Manage,
        Organization.View,
        Organization.Manage,
        Sales.View,
        Sales.Manage,
        Purchasing.View,
        Purchasing.Manage,
        Inventory.View,
        Inventory.Manage,
        Billing.View,
        Billing.Manage
    ];
}