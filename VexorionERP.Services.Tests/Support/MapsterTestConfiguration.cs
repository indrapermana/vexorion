using Mapster;
using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Services;

/// <summary>
/// Registers Mapster type mappings needed for service layer tests.
/// BaseCommandService.BuildEntityResponse calls entity.Adapt&lt;IEntityResponse&lt;T&gt;&gt;().
/// Mapster must know which concrete type implements IEntityResponse&lt;T&gt; for each model.
/// We achieve this by registering source→concrete, and pointing the interface mapping to use the concrete type.
/// </summary>
internal static class MapsterTestConfiguration
{
    private static bool _configured;
    private static readonly object _lock = new();

    public static void Configure()
    {
        if (_configured) return;
        lock (_lock)
        {
            if (_configured) return;

            RegisterEntityResponse<Customer, CustomerDetailsResponse>();
            RegisterEntityResponse<Supplier, SupplierDetailsResponse>();
            RegisterEntityResponse<Company, CompanyDetailsResponse>();
            RegisterEntityResponse<Warehouse, WarehouseDetailsResponse>();
            RegisterEntityResponse<Department, DepartmentDetailsResponse>();
            RegisterEntityResponse<Employee, EmployeeDetailsResponse>();
            RegisterEntityResponse<Product, ProductDetailsResponse>();
            RegisterEntityResponse<InventoryBalance, InventoryBalanceDetailsResponse>();

            RegisterEntityListResponse<Customer, CustomerListItemResponse>();
            RegisterEntityListResponse<Supplier, SupplierListItemResponse>();
            RegisterEntityListResponse<Company, CompanyListItemResponse>();
            RegisterEntityListResponse<Warehouse, WarehouseListItemResponse>();
            RegisterEntityListResponse<Department, DepartmentListItemResponse>();
            RegisterEntityListResponse<Employee, EmployeeListItemResponse>();
            RegisterEntityListResponse<Product, ProductListItemResponseProxy>();
            RegisterEntityListResponse<InventoryBalance, InventoryBalanceListItemResponse>();

            _configured = true;
        }
    }

    private static void RegisterEntityResponse<TModel, TConcrete>()
        where TModel : class
        where TConcrete : class, IEntityResponse<TModel>, new()
    {
        // Register TModel -> TConcrete so Adapt<IEntityResponse<TModel>>() resolves correctly.
        // Since Mapster can't map to an interface target directly, we register the concrete
        // type and also a global-settings entry for the interface.
        TypeAdapterConfig<TModel, TConcrete>.NewConfig();

        // Override the global config for the interface target using ConstructUsing.
        TypeAdapterConfig<TModel, IEntityResponse<TModel>>.NewConfig()
            .ConstructUsing(_ => new TConcrete());
    }

    private static void RegisterEntityListResponse<TModel, TConcrete>()
        where TModel : class
        where TConcrete : class, IEntityListResponse<TModel>, new()
    {
        TypeAdapterConfig<TModel, TConcrete>.NewConfig();

        TypeAdapterConfig<TModel, IEntityListResponse<TModel>>.NewConfig()
            .ConstructUsing(_ => new TConcrete());
    }

    private sealed class ProductListItemResponseProxy : ProductListItemResponse, IEntityListResponse<Product>;
}
