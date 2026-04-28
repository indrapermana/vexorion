namespace VexorionERP.Models;

public static class RolePermissionMatrix
{
    public static IReadOnlyDictionary<string, IReadOnlyCollection<string>> All { get; } =
        new Dictionary<string, IReadOnlyCollection<string>>
        {
            [AppRoles.SystemAdmin] = AppPermissions.All,
            [AppRoles.TenantAdmin] = AppPermissions.All,
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
                AppPermissions.InventoryAdjustments.View,
                AppPermissions.InventoryAdjustments.Manage,
                AppPermissions.StockTransfers.View,
                AppPermissions.StockTransfers.Manage,
                AppPermissions.StockCounts.View,
                AppPermissions.StockCounts.Manage,
                AppPermissions.SalesInvoices.View,
                AppPermissions.SalesInvoices.Manage,
                AppPermissions.PurchaseInvoices.View,
                AppPermissions.PurchaseInvoices.Manage,
                AppPermissions.Payments.View,
                AppPermissions.Payments.Manage,
                AppPermissions.Accounting.View,
                AppPermissions.Reports.View,
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
                AppPermissions.InventoryAdjustments.View,
                AppPermissions.StockTransfers.View,
                AppPermissions.StockCounts.View,
                AppPermissions.SalesInvoices.View,
                AppPermissions.PurchaseInvoices.View,
                AppPermissions.Payments.View,
                AppPermissions.Accounting.View,
                AppPermissions.Reports.View,
                AppPermissions.Billing.View
            ]
        };
}
