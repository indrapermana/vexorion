namespace VexorionERP.Models;

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

    public static class Projects
    {
        public const string View = "projects.view";
        public const string Manage = "projects.manage";
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

    public static class InventoryAdjustments
    {
        public const string View = "inventory-adjustments.view";
        public const string Manage = "inventory-adjustments.manage";
    }

    public static class StockTransfers
    {
        public const string View = "stock-transfers.view";
        public const string Manage = "stock-transfers.manage";
    }

    public static class StockCounts
    {
        public const string View = "stock-counts.view";
        public const string Manage = "stock-counts.manage";
    }

    public static class SalesInvoices
    {
        public const string View = "sales-invoices.view";
        public const string Manage = "sales-invoices.manage";
    }

    public static class PurchaseInvoices
    {
        public const string View = "purchase-invoices.view";
        public const string Manage = "purchase-invoices.manage";
    }

    public static class Payments
    {
        public const string View = "payments.view";
        public const string Manage = "payments.manage";
    }

    public static class Accounting
    {
        public const string View = "accounting.view";
        public const string Manage = "accounting.manage";
    }

    public static class Reports
    {
        public const string View = "reports.view";
    }

    public static class Billing
    {
        public const string View = "billing.view";
        public const string Manage = "billing.manage";
    }

    public static class Imports
    {
        public const string Validate = "imports.validate";
        public const string Submit = "imports.submit";
        public const string ViewHistory = "imports.history.view";
    }

    public static class Documents
    {
        public const string Generate = "documents.generate";
        public const string View = "documents.view";
        public const string Download = "documents.download";
        public const string Regenerate = "documents.regenerate";
        public const string ViewOrDownloadPolicy = "documents.view-or-download";
    }

    public static class ProjectDocuments
    {
        public const string View = "project-documents.view";
        public const string Upload = "project-documents.upload";
        public const string Download = "project-documents.download";
        public const string Manage = "project-documents.manage";
        public const string ViewOrDownloadPolicy = "project-documents.view-or-download";
    }

    public static class Tenants
    {
        public const string View = "tenants.view";
        public const string Manage = "tenants.manage";
    }

    public static class TenantPlans
    {
        public const string View = "tenant-plans.view";
        public const string Manage = "tenant-plans.manage";
    }

    public static class TenantModules
    {
        public const string View = "tenant-modules.view";
        public const string Manage = "tenant-modules.manage";
    }

    public static class StorageUsage
    {
        public const string View = "storage-usage.view";
    }

    public static class Pos
    {
        public const string Checkout = "pos.checkout";
        public const string Refund = "pos.refund";
        public const string Reprint = "pos.reprint";
        public const string ShiftClose = "pos.shift_close";
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
        Projects.View,
        Projects.Manage,
        Organization.View,
        Organization.Manage,
        Sales.View,
        Sales.Manage,
        Purchasing.View,
        Purchasing.Manage,
        Inventory.View,
        Inventory.Manage,
        InventoryAdjustments.View,
        InventoryAdjustments.Manage,
        StockTransfers.View,
        StockTransfers.Manage,
        StockCounts.View,
        StockCounts.Manage,
        SalesInvoices.View,
        SalesInvoices.Manage,
        PurchaseInvoices.View,
        PurchaseInvoices.Manage,
        Payments.View,
        Payments.Manage,
        Accounting.View,
        Accounting.Manage,
        Reports.View,
        Billing.View,
        Billing.Manage,
        Imports.Validate,
        Imports.Submit,
        Imports.ViewHistory,
        Documents.Generate,
        Documents.View,
        Documents.Download,
        Documents.Regenerate,
        ProjectDocuments.View,
        ProjectDocuments.Upload,
        ProjectDocuments.Download,
        ProjectDocuments.Manage,
        Tenants.View,
        Tenants.Manage,
        TenantPlans.View,
        TenantPlans.Manage,
        TenantModules.View,
        TenantModules.Manage,
        StorageUsage.View,
        Pos.Checkout,
        Pos.Refund,
        Pos.Reprint,
        Pos.ShiftClose
    ];
}
