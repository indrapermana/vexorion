# VexorionERP — QA Test Plan

**Version:** 1.0  
**Date:** 3 May 2026  
**Applications under test:**
- **Main App** — ERP (port 5173)
- **POS** — Point of Sale (port 5175)
- **Admin UI** — Tenant Management (port 5174)

**Test environment prerequisite:** Backend running on `http://localhost:5000`. Seed tenant `demo`, user `admin@demo.local`, password `DemoAdmin123!`.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Pass | Expected result matches |
| ❌ Fail | Expected result not met |
| ⚠️ Partial | Partially working |

---

## Part 1 — Main App (ERP)

### 1.1 Authentication

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.1.1 | Login with valid credentials | Enter `admin@demo.local` / `DemoAdmin123!` → click Sign In | Redirected to Dashboard |
| 1.1.2 | Login with wrong password | Enter valid email + wrong password → click Sign In | Error message shown, stay on login |
| 1.1.3 | Login with empty fields | Click Sign In with empty fields | Validation errors shown on both fields |
| 1.1.4 | Logout | Click user avatar → Logout | Redirected to `/login`, session cleared |
| 1.1.5 | Access protected route without auth | Navigate to `/` directly without login | Redirected to `/login` |
| 1.1.6 | Token auto-refresh | Stay logged in > 15 min, perform any action | Session continues without re-login prompt |
| 1.1.7 | Session timeout warning | Leave session idle | Warning dialog appears before expiry |

---

### 1.2 Dashboard

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.2.1 | Dashboard loads | Login → navigate to `/` | KPI cards, charts, and sections render without error |
| 1.2.2 | Currency displays correctly | Set company currency to IDR → reload dashboard | All monetary values shown in IDR, not USD |
| 1.2.3 | KPI cards | View dashboard | Cards show Revenue, Outstanding AR, Open Orders, Inventory Value |
| 1.2.4 | Aging section | View dashboard | AR aging buckets (Current, 1–30, 31–60, 61–90, 90+) shown with correct totals |
| 1.2.5 | Top customers section | View dashboard | Top customers list with revenue amounts |
| 1.2.6 | Recent orders section | View dashboard | Recent sales orders listed |
| 1.2.7 | Business health section | View dashboard | Health indicators shown |

---

### 1.3 Configuration

#### 1.3.1 Company Settings

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.3.1.1 | View company settings | Config → Company | Company name, currency code, address fields visible |
| 1.3.1.2 | Change currency to IDR | Set Currency Code to `IDR` → Save | Success feedback; dashboard now shows IDR |
| 1.3.1.3 | Save with empty company name | Clear company name → Save | Validation error shown |

#### 1.3.2 Users

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.3.2.1 | List users | Config → Users | User list with name, email, role columns |
| 1.3.2.2 | Create user | Click Add → fill name/email/password/role → Save | User appears in list |
| 1.3.2.3 | Create user with duplicate email | Add user with existing email | Error: email already taken |
| 1.3.2.4 | Create user with weak password | Enter password without required complexity | Validation error shown |
| 1.3.2.5 | Edit user roles | Click user → Edit Roles → change roles → Save | Updated roles reflected |
| 1.3.2.6 | Disable user | Click user → Disable | User status changes; disabled user cannot login |
| 1.3.2.7 | Reset password | Click user → Reset Password → enter new password | Success; user can login with new password |

#### 1.3.3 Roles & Permissions

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.3.3.1 | List roles | Config → Roles | All roles listed with permission counts |
| 1.3.3.2 | Create role | Click Add Role → enter name + select permissions → Save | Role appears in list |
| 1.3.3.3 | Edit role permissions | Click role → modify permissions → Save | Updated permissions saved |
| 1.3.3.4 | Delete role | Click Delete on a role not assigned to any user | Role removed |
| 1.3.3.5 | Delete role in use | Attempt to delete a role assigned to a user | Error: role in use |

#### 1.3.4 Menu Configuration

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.3.4.1 | View menu config | Config → Menu | Menu items listed with enable/disable toggles |
| 1.3.4.2 | Hide a menu item | Toggle a menu item off → Save | Item disappears from sidebar navigation |
| 1.3.4.3 | Re-enable hidden item | Toggle item back on → Save | Item reappears in sidebar |

#### 1.3.5 Tax & Discount

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.3.5.1 | List tax codes | Config → Tax & Discount | Tax codes listed |
| 1.3.5.2 | Create tax code | Add tax with name + rate → Save | Appears in list; available in invoice editor |
| 1.3.5.3 | Edit tax rate | Change rate on existing tax → Save | Updated rate reflected |

#### 1.3.6 Product Categories

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.3.6.1 | Create category | Config → Product Categories → Add → Save | Category available when creating products |
| 1.3.6.2 | Edit category name | Edit → change name → Save | Updated name shown |
| 1.3.6.3 | Delete unused category | Delete a category with no products | Removed from list |

---

### 1.4 Products & Inventory

#### 1.4.1 Products

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.4.1.1 | List products | Products page | Products grid with name, SKU, category, price |
| 1.4.1.2 | Create product | Add → fill required fields → Save | Product appears in list |
| 1.4.1.3 | Create product — missing required fields | Save with empty Name or SKU | Validation errors shown |
| 1.4.1.4 | Edit product | Click product → Edit → change price → Save | Updated price shown |
| 1.4.1.5 | Deactivate product | Toggle Active off → Save | Product not shown in POS catalog |
| 1.4.1.6 | View product identifiers | Click product → Identifiers tab | Barcodes/identifiers listed |

#### 1.4.2 Warehouses

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.4.2.1 | Create warehouse | Warehouses → Add → enter code + name → Save | Warehouse available in transfers, stock counts |
| 1.4.2.2 | Edit warehouse | Edit name → Save | Updated |
| 1.4.2.3 | Deactivate warehouse | Toggle Active off → Save | Not available for new transactions |

#### 1.4.3 Inventory Adjustments

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.4.3.1 | Create adjustment | Add → select warehouse + product → enter quantity → Save | Inventory balance updated |
| 1.4.3.2 | View adjustment history | List page | All adjustments shown with date, user, quantity |

#### 1.4.4 Stock Counts

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.4.4.1 | Create stock count | Add → select warehouse → add lines → Save | Count saved |
| 1.4.4.2 | Post stock count | Open count → Post | Inventory balances updated to counted quantities |

#### 1.4.5 Stock Transfers

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.4.5.1 | Create transfer | Add → select From/To warehouse + products + qty → Save | Transfer created |
| 1.4.5.2 | Post transfer | Open transfer → Post | From warehouse decremented, To warehouse incremented |
| 1.4.5.3 | Transfer with insufficient stock | Enter qty exceeding source balance | Error: insufficient stock |

---

### 1.5 Sales

#### 1.5.1 Sales Orders

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.5.1.1 | Create sales order | Sales Orders → Add → select customer + lines → Save | Order created with Draft status |
| 1.5.1.2 | Add multiple order lines | Add 3+ product lines with different quantities | All lines saved correctly |
| 1.5.1.3 | Edit sales order | Open order → Edit → change quantity → Save | Updated |
| 1.5.1.4 | Delete draft order | Delete a draft order | Removed from list |
| 1.5.1.5 | View currency display | Open order with IDR set | Amounts shown in IDR |

#### 1.5.2 Sales Invoices

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.5.2.1 | Create sales invoice | Sales Invoices → Add → select customer + lines → Save | Invoice created |
| 1.5.2.2 | Apply tax code | Add line → select tax → Save | Tax amount calculated and shown |
| 1.5.2.3 | Post invoice | Open invoice → Post | Status changes to Posted; journal entry created |
| 1.5.2.4 | Create credit note | Open posted invoice → Credit Note | Credit note created linked to original |
| 1.5.2.5 | Record payment against invoice | Open invoice → Record Payment | Invoice balance reduced |

#### 1.5.3 Sales Shipments

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.5.3.1 | Create shipment | Sales Shipments → Add → select order + warehouse → Save | Shipment created |
| 1.5.3.2 | Post shipment | Open shipment → Post | Inventory decremented |

#### 1.5.4 Customer Payments

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.5.4.1 | Record payment | Customer Payments → Add → select customer + amount + method | Payment saved |
| 1.5.4.2 | View payment history | Customer Payments list | All payments listed with date and amount |

---

### 1.6 Purchasing

#### 1.6.1 Purchase Orders

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.6.1.1 | Create purchase order | Purchase Orders → Add → select supplier + lines → Save | PO created |
| 1.6.1.2 | Edit purchase order | Open PO → change quantity → Save | Updated |

#### 1.6.2 Purchase Receipts

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.6.2.1 | Receive goods | Purchase Receipts → Add → select PO + warehouse → Save | Receipt created |
| 1.6.2.2 | Post receipt | Open receipt → Post | Inventory incremented |

#### 1.6.3 Purchase Invoices

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.6.3.1 | Create purchase invoice | Purchase Invoices → Add → select supplier + lines → Save | Invoice created |
| 1.6.3.2 | Post purchase invoice | Open invoice → Post | Status Posted; payable entry created |

#### 1.6.4 Vendor Payments

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.6.4.1 | Record vendor payment | Vendor Payments → Add → select supplier + amount → Save | Payment recorded |

---

### 1.7 Finance & Accounting

#### 1.7.1 Accounts

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.7.1.1 | View chart of accounts | Accounts page | Accounts listed with code, name, type |
| 1.7.1.2 | Create account | Add → fill code + name + type → Save | Account available for journal entries |

#### 1.7.2 Journals

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.7.2.1 | View journal entries | Journals page | All journal entries listed |
| 1.7.2.2 | Create manual journal | Add → add debit/credit lines → Save | Entry saved; debits = credits |
| 1.7.2.3 | Unbalanced journal | Save with debit ≠ credit total | Validation error shown |

#### 1.7.3 Fiscal Periods

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.7.3.1 | Create fiscal period | Fiscal Periods → Add → enter name + start/end date → Save | Period created |
| 1.7.3.2 | Overlap detection | Create period overlapping existing dates | Error: overlapping period |
| 1.7.3.3 | Close period | Open period → Close | Status changes to Closed |

#### 1.7.4 Reports

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.7.4.1 | View Balance Sheet | Reports → Balance Sheet | Assets = Liabilities + Equity |
| 1.7.4.2 | View P&L | Reports → Profit & Loss | Revenue, expenses, and net income shown |
| 1.7.4.3 | View Cash Flow | Reports → Cash Flow | Cash flow categories shown |
| 1.7.4.4 | View AR Aging | Reports → AR Aging | Aging buckets match dashboard values |

---

### 1.8 Audit Logs

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.8.1 | View audit log | Audit Logs page | Log entries with user, action, timestamp |
| 1.8.2 | Create/edit action is logged | Perform any create/update → check audit log | Entry recorded with correct user and action |

---

### 1.9 Customers & Suppliers

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.9.1 | Create customer | Customers → Add → name + contact → Save | Customer available in sales forms |
| 1.9.2 | Edit customer | Edit name/email → Save | Updated |
| 1.9.3 | Create supplier | Suppliers → Add → name + contact → Save | Supplier available in purchase forms |
| 1.9.4 | Duplicate email detection | Create customer with already-used email | Error shown |

---

## Part 2 — POS Application

### 2.1 Authentication

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 2.1.1 | Login | Enter credentials → Sign In | Redirected to POS page |
| 2.1.2 | Login without POS role | Login with a user that has no `PosUser` role | Access denied or empty catalog |
| 2.1.3 | Session timeout warning | Leave POS idle | Warning banner appears; user can refresh session |
| 2.1.4 | Logout | Click logout in header | Redirected to POS login |

---

### 2.2 Shift Management

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 2.2.1 | Open shift | POS page loads → Open Shift dialog appears → enter opening cash → Open | Shift opened; cashier name and shift info shown in header |
| 2.2.2 | Shift persists on refresh | Open shift → refresh browser | Shift still active (loaded from backend) |
| 2.2.3 | Close shift without counted cash | Click Close Shift → leave counted cash empty → Confirm | Shift closed; confirmation shown |
| 2.2.4 | Close shift with counted cash | Click Close Shift → enter counted amount → Confirm | Shift closed with variance calculated |
| 2.2.5 | Block checkout when shift closed | Attempt checkout without opening shift | Checkout button disabled |
| 2.2.6 | Only shift owner or manager can close | Login as different cashier → attempt to close another's shift | Not allowed (permission check) |

---

### 2.3 Product Catalog

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 2.3.1 | Products load | Open shift → view catalog panel | Active products listed with name and price |
| 2.3.2 | Search products | Type in search box | List filtered in real time |
| 2.3.3 | Inactive products hidden | Deactivate a product in ERP → reload POS | Product no longer in catalog |
| 2.3.4 | Price displays in correct currency | Company currency set to IDR | POS shows IDR amounts |

---

### 2.4 Cart Operations

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 2.4.1 | Add product to cart | Click product in catalog | Product added to cart with quantity 1 |
| 2.4.2 | Increase quantity | Click product again or use `+` | Quantity incremented |
| 2.4.3 | Decrease quantity | Click `−` on cart line | Quantity decremented |
| 2.4.4 | Remove line | Decrease quantity to 0 or click remove | Line removed from cart |
| 2.4.5 | Cart total calculation | Add multiple products | Subtotal, tax, and total calculated correctly |
| 2.4.6 | Clear cart | Click Clear | All lines removed |

---

### 2.5 Customer Selection

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 2.5.1 | Guest sale | Leave customer as Guest → checkout | Sale recorded without customer |
| 2.5.2 | Select existing customer | Choose customer from dropdown | Customer linked to sale |
| 2.5.3 | Quick create customer | Click + next to customer → fill name/phone → Create | Customer created and selected |
| 2.5.4 | Quick create — missing name | Submit with empty name | Validation error shown |

---

### 2.6 Checkout & Payment

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 2.6.1 | Cash payment — exact amount | Enter exact total as payment → Checkout | Success; no change due |
| 2.6.2 | Cash payment — overpayment | Enter amount > total | Change amount shown on receipt |
| 2.6.3 | Cash payment — underpayment | Enter amount < total | Error: insufficient payment |
| 2.6.4 | Card payment | Select Card as payment method → Checkout | Sale recorded with Card method |
| 2.6.5 | Checkout without warehouse | Leave warehouse unselected → Checkout | Validation error: warehouse required |
| 2.6.6 | Stock conflict | Checkout item with insufficient stock | Stock Conflict dialog shown listing affected items |
| 2.6.7 | Receipt displayed | Successful checkout | Receipt modal with transaction details, items, total |
| 2.6.8 | Receipt can be dismissed | Click Close on receipt | Cart cleared; ready for next sale |
| 2.6.9 | Delivery flag | Toggle Is Delivery → Checkout | Sale recorded with delivery flag |

---

### 2.7 Return & Refund

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 2.7.1 | Open refund dialog | Click Return/Refund | Dialog opens with transaction ID field |
| 2.7.2 | Valid return | Enter a valid transaction ID → select items → Confirm | Refund recorded; inventory restocked |
| 2.7.3 | Invalid transaction ID | Enter non-existent ID | Error: transaction not found |
| 2.7.4 | Partial return | Select only some items from the original sale | Only selected items refunded |

---

### 2.8 Transaction History

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 2.8.1 | View history | Click History panel | Recent transactions listed |
| 2.8.2 | History updates after sale | Complete a sale → open history | New transaction at top |

---

### 2.9 POS Admin (Role Management)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 2.9.1 | Access admin panel | Login as user with `roles.manage` permission | Admin link visible in POS header |
| 2.9.2 | Grant POS role | Toggle PosUser on for a user → Save | User can now access POS checkout |
| 2.9.3 | Revoke POS role | Toggle PosUser off → Save | User loses checkout access |
| 2.9.4 | Non-admin cannot access | Login as regular cashier | Admin panel not accessible |

---

### 2.10 POS Settings

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 2.10.1 | Change language | Settings → switch language (EN/ID/ES) | All POS UI text updates to selected language |
| 2.10.2 | Change theme | Settings → switch dark/light mode | Theme applies immediately |

---

## Part 3 — Admin UI (Tenant Management)

### 3.1 Authentication

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 3.1.1 | Login | Enter super-admin credentials → Sign In | Redirected to Admin Dashboard |
| 3.1.2 | Wrong credentials | Enter invalid password | Error message, stay on login |
| 3.1.3 | Access without login | Navigate to `/tenants` directly | Redirected to `/login` |
| 3.1.4 | Logout | Click Logout | Session cleared; redirected to login |

---

### 3.2 Dashboard

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 3.2.1 | Admin dashboard loads | Login → Dashboard | System stats visible (tenant count, active tenants) |

---

### 3.3 Tenant Management

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 3.3.1 | List tenants | Tenants page | All tenants listed with name, code, status |
| 3.3.2 | Active/total count | View header stats | Correct counts of active vs total tenants shown |
| 3.3.3 | Create tenant | Click Add → enter Name + Code → Save | Tenant appears in list with Active status |
| 3.3.4 | Create tenant — missing name | Save with empty name | Validation error shown |
| 3.3.5 | Create tenant — duplicate code | Enter an already-used tenant code | Error: code already taken |
| 3.3.6 | Edit tenant | Click Edit → change name → Save | Updated name shown in list |
| 3.3.7 | Delete tenant | Click Delete → confirm | Tenant removed from list |
| 3.3.8 | Delete last active tenant | Attempt to delete the only active tenant | Confirm behavior (allowed or blocked by business rule) |

---

### 3.4 User Management (Admin)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 3.4.1 | List all users | Users page | All users across tenants listed |
| 3.4.2 | Filter by tenant | Select tenant from dropdown | List filtered to that tenant's users |
| 3.4.3 | Create user | Click Add → fill username/email/password/tenant/roles → Create | User appears in list; can login to main app |
| 3.4.4 | Create user — duplicate email | Enter existing email | Error: email in use |
| 3.4.5 | Create user — weak password | Enter short/simple password | Validation error shown |
| 3.4.6 | Assign roles to user | Click Roles → select roles → Save | Updated roles applied |
| 3.4.7 | Reset user password | Click Reset Password → enter new password → Save | User can login with new password |
| 3.4.8 | Enable/disable user | Toggle user active status | Disabled user cannot login |

---

### 3.5 Menu Configuration (Admin)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 3.5.1 | View menu config | Menu Configuration page | Navigation items listed with visibility toggles |
| 3.5.2 | Hide menu item | Toggle item off → Save | Item hidden from ERP navigation for that tenant |
| 3.5.3 | Restore menu item | Toggle item on → Save | Item reappears |

---

## Part 4 — Cross-Cutting Scenarios

### 4.1 Permissions & Access Control

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 4.1.1 | Read-only user cannot create | Login as user with only `view` permissions | Create/Edit/Delete buttons not shown or disabled |
| 4.1.2 | Unauthorized API blocked | Call API directly without token | 401 returned |
| 4.1.3 | Cross-tenant data isolation | Login as tenant A → attempt to view tenant B's data | Not accessible |

### 4.2 Data Validation

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 4.2.1 | Required field enforcement | Submit any form with required fields empty | Inline validation errors shown per field |
| 4.2.2 | Numeric field — negative value | Enter negative quantity on order line | Validation error |
| 4.2.3 | Date field — invalid format | Enter non-date text in date fields | Validation error |

### 4.3 Localization

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 4.3.1 | Switch ERP to Bahasa Indonesia | Browser/app language set to `id-ID` | All ERP labels in Bahasa Indonesia |
| 4.3.2 | Switch POS to Bahasa Indonesia | POS settings → language → ID | All POS labels translated |
| 4.3.3 | Currency format — IDR | Company currency = IDR | Numbers formatted without decimal (e.g. Rp 10.000) |

### 4.4 Logging & Observability

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 4.4.1 | Controller call logged | Perform any API action | Info log appears in Grafana Loki with `app=vexorionerp` label |
| 4.4.2 | Error logged | Submit an invalid request that causes a server error | Error log with stack trace visible in Grafana |
| 4.4.3 | Request log | Any HTTP call | Serilog request log shows method, path, status, and elapsed ms |

### 4.5 Rate Limiting

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 4.5.1 | Normal usage not throttled | Perform typical operations | Responses are 200/201/204 |
| 4.5.2 | Rapid requests throttled | Fire 201+ requests in 10 seconds to any endpoint | 429 Too Many Requests returned |

---

## Test Execution Notes

- Execute tests in the order listed within each section — some scenarios depend on data created by prior steps.
- Use a dedicated test tenant (`demo`) to avoid polluting production data.
- Clear browser localStorage/cookies between independent test sessions.
- Record the exact error message text when a test fails.
- POS shift must be opened before any POS transaction tests (section 2.6+).
