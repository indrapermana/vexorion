# Milestone D Checklist — Payments & Invoice Balances

## Scope
Introduce customer and vendor payment recording, track balances on invoices, and surface outstanding-invoice filtering across the full stack.

---

## Backend

### Data Models
- [x] `CustomerPayment` entity (`VexorionERP.Models/Sales/CustomerPayment.cs`)
- [x] `VendorPayment` entity (`VexorionERP.Models/Purchasing/VendorPayment.cs`)
- [x] Navigation properties added to `Customer`, `Supplier`, `SalesInvoice`, `PurchaseInvoice`

### EF Core / Database
- [x] `CustomerPaymentConfiguration` fluent config
- [x] `VendorPaymentConfiguration` fluent config
- [x] `AppDbContext` DbSets registered
- [x] Migration `20260425133443_AddCustomerAndVendorPayments` applied

### Services
- [x] `ICustomerPaymentService` / `CustomerPaymentService` (create, list, delete)
- [x] `IVendorPaymentService` / `VendorPaymentService` (create, list, delete)
- [x] `ISalesInvoiceQueryService` / `SalesInvoiceQueryService` — `outstandingOnly` filter
- [x] `IPurchaseInvoiceQueryService` / `PurchaseInvoiceQueryService` — `outstandingOnly` filter

### Controllers
- [x] `CustomerPaymentsController` (GET list, POST create, DELETE)
- [x] `VendorPaymentsController` (GET list, POST create, DELETE)
- [x] `SalesInvoicesController` — `?outstandingOnly=true` query param
- [x] `PurchaseInvoicesController` — `?outstandingOnly=true` query param

### Auth / DI
- [x] Payment services registered in DI (`IdentityServiceCollectionExtensions`)
- [x] Policy-based auth on payment controller actions (`AppPermissions.Sales.*`, `AppPermissions.Purchasing.*`)

---

## Tests

| Suite | Tests | Result |
|---|---|---|
| `VexorionERP.Services.Tests` | 54 | ✅ Passed |
| `VexorionERP.Web.Tests` | 44 | ✅ Passed |
| **Total** | **98** | ✅ All passed |

Specific test classes added this milestone:
- [x] `SalesInvoiceQueryServiceTests` — outstanding filter (all, outstanding-only, paid excluded)
- [x] `PurchaseInvoiceQueryServiceTests` — outstanding filter (all, outstanding-only, paid excluded)
- [x] `CustomerPaymentsControllerTests` — auth, create, list (prior session)
- [x] `VendorPaymentsControllerTests` — auth, create, list (prior session)

---

## Frontend

### API Layer
- [x] `salesInvoices.ts` — `getSalesInvoices(outstandingOnly?)` param added
- [x] `purchaseInvoices.ts` — `getPurchaseInvoices(outstandingOnly?)` param added
- [x] `customerPayments.ts` — full CRUD API functions
- [x] `vendorPayments.ts` — full CRUD API functions

### Types
- [x] API types: `CustomerPaymentListItemResponse`, `CustomerPaymentCreateRequest`, `CustomerPaymentResponse`
- [x] API types: `VendorPaymentListItemResponse`, `VendorPaymentCreateRequest`, `VendorPaymentResponse`
- [x] UI types: `CustomerPaymentGridRow`, `CustomerPaymentFormValues`, `CustomerPaymentDialogMode`
- [x] UI types: `VendorPaymentGridRow`, `VendorPaymentFormValues`, `VendorPaymentDialogMode`
- [x] Barrel exports updated (`types/api/index.ts`, `types/ui/index.ts`)

### Payment Feature Pages
- [x] `CustomerPaymentDataGrid` — MUI DataGrid with delete action
- [x] `CustomerPaymentEditorDialog` — react-hook-form + yup create dialog
- [x] `CustomerPaymentsPage` — full CRUD surface with outstanding invoice selector
- [x] `VendorPaymentDataGrid` — MUI DataGrid with delete action
- [x] `VendorPaymentEditorDialog` — react-hook-form + yup create dialog
- [x] `VendorPaymentsPage` — full CRUD surface with outstanding invoice selector

### Invoice Screen Wiring
- [x] `SalesInvoicesPage` — "Outstanding only" toggle (Switch) filters grid
- [x] `SalesInvoicesPage` — "Record Payment" action navigates to `/customer-payments` with prefilled state
- [x] `SalesInvoiceDataGrid` — `onRecordPayment` row action button
- [x] `PurchaseInvoicesPage` — "Outstanding only" toggle filters grid
- [x] `PurchaseInvoicesPage` — "Record Payment" action navigates to `/vendor-payments` with prefilled state
- [x] `PurchaseInvoiceDataGrid` — `onRecordPayment` row action button

### Routing / Navigation
- [x] `/customer-payments` route added to `App.tsx`
- [x] `/vendor-payments` route added to `App.tsx`
- [x] "Customer Payments" nav entry in `AppLayout.tsx` (Sales section)
- [x] "Vendor Payments" nav entry in `AppLayout.tsx` (Purchasing section)

### Build
- [x] `npm run build` — clean build, no TypeScript errors

---

## Status: ✅ COMPLETE
