namespace VexorionERP.Models.Identity;

public static class RolePermissionMatrix
{
    public static IReadOnlyDictionary<string, IReadOnlyCollection<string>> All { get; } =
        new Dictionary<string, IReadOnlyCollection<string>>
        {
            [AppRoles.SystemAdmin] = AppPermissions.All,
            [AppRoles.TenantAdmin] =
            [
                AppPermissions.Users.View,
                AppPermissions.Users.Manage,
                AppPermissions.Roles.View,
                AppPermissions.Roles.Manage,
                AppPermissions.Customers.View,
                AppPermissions.Customers.Manage,
                AppPermissions.Suppliers.View,
                AppPermissions.Suppliers.Manage,
                AppPermissions.Products.View,
                AppPermissions.Products.Manage,
                AppPermissions.Organization.View,
                AppPermissions.Organization.Manage,
                AppPermissions.Sales.View,
                AppPermissions.Sales.Manage,
                AppPermissions.Purchasing.View,
                AppPermissions.Purchasing.Manage,
                AppPermissions.Inventory.View,
                AppPermissions.Inventory.Manage,
                AppPermissions.Billing.View,
                AppPermissions.Billing.Manage
            ],
            [AppRoles.Manager] =
            [
                AppPermissions.Users.View,
                AppPermissions.Customers.View,
                AppPermissions.Customers.Manage,
                AppPermissions.Suppliers.View,
                AppPermissions.Products.View,
                AppPermissions.Products.Manage,
                AppPermissions.Organization.View,
                AppPermissions.Sales.View,
                AppPermissions.Sales.Manage,
                AppPermissions.Purchasing.View,
                AppPermissions.Inventory.View,
                AppPermissions.Inventory.Manage,
                AppPermissions.Billing.View,
                AppPermissions.Billing.Manage
            ],
            [AppRoles.Staff] =
            [
                AppPermissions.Customers.View,
                AppPermissions.Suppliers.View,
                AppPermissions.Products.View,
                AppPermissions.Organization.View,
                AppPermissions.Sales.View,
                AppPermissions.Purchasing.View,
                AppPermissions.Inventory.View,
                AppPermissions.Billing.View
            ]
        };
}