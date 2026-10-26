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
| 1.4.3.1 | Create adjustment | Add → select warehouse → Save as Draft; add one positive or negative line | Document and line are saved; inventory balance is unchanged while Draft |
| 1.4.3.2 | Complete adjustment | Edit Draft → choose Completed → Save → confirm the displayed effect | Status becomes Completed and the signed quantity delta is posted once |
| 1.4.3.3 | Cancel Draft adjustment | Edit Draft → choose Cancelled → Save → confirm cancellation | Status becomes Cancelled; no inventory movement is posted |
| 1.4.3.4 | Reverse completed adjustment | Edit Completed → choose Cancelled → review the reversal preview → confirm | Status becomes Cancelled; a compensating movement restores the prior balance; original movement remains in history |
| 1.4.3.5 | Edit locked adjustment | Open a Completed or Cancelled adjustment | Lines and warehouse are read-only; editable header metadata remains available; deleting is disabled |

#### 1.4.4 Stock Counts

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.4.4.1 | Create stock count | Add → select warehouse → add lines → Save | Count is Draft; inventory balance is unchanged |
| 1.4.4.2 | Post stock count | Open Draft count → Post → review variance and resulting balances → confirm | Status becomes Completed and each counted variance is posted once |
| 1.4.4.3 | Reverse stock count | Open Completed count → Reverse → review compensating effects → confirm | Status becomes Cancelled; compensating movements restore prior balances; original count remains in history |
| 1.4.4.4 | Reverse with insufficient stock | Consume stock added by the count, then attempt Reverse | Reversal is rejected; status and balances remain unchanged |
| 1.4.4.5 | Edit locked stock count | Open a Completed or Cancelled count | Lines and warehouse are read-only; editable header metadata remains available; deleting is disabled |

#### 1.4.5 Stock Transfers

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.4.5.1 | Create transfer | Add → select source/destination warehouses → add lines → Save | Transfer is Draft; both warehouse balances are unchanged |
| 1.4.5.2 | Complete transfer | Edit Draft → choose Completed → Save → review source/destination effects → confirm | Status becomes Completed; source is decremented and destination incremented once |
| 1.4.5.3 | Reverse completed transfer | Edit Completed → choose Cancelled → review reversal preview → confirm | Status becomes Cancelled; compensating movements restore both balances; original movements remain in history |
| 1.4.5.4 | Reverse with insufficient destination stock | Consume transferred stock at destination, then attempt reversal | Reversal is rejected; status and balances remain unchanged |
| 1.4.5.5 | Complete with insufficient source stock | Enter a line quantity exceeding source on-hand, then complete | Completion is rejected with insufficient-stock feedback; no movements are posted |
| 1.4.5.6 | Edit locked transfer | Open a Completed or Cancelled transfer | Lines and warehouses are read-only; editable header metadata remains available; deleting is disabled |

#### 1.4.6 Inventory Reports

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.4.6.1 | Current inventory valuation | Open Inventory Reports → Valuation; compare a product with known on-hand and standard cost | Estimated value equals current on-hand multiplied by current standard cost; the report clearly identifies this as an estimate, not historical/FIFO valuation |
| 1.4.6.2 | Balance-to-ledger reconciliation | Compare a product/warehouse row with posted inventory movements and an opening/manual balance | Ledger net equals the sum of on-hand movement deltas; variance equals current balance minus ledger net, exposing opening/manual balance differences |
| 1.4.6.3 | Movement audit filters | Select a date range and warehouse; navigate pages | Entries are newest first, within the inclusive date range and selected warehouse, with movement type, signed on-hand/reserved deltas, and source reference |
| 1.4.6.4 | Reorder recommendations | Compare active products with reorder levels against available stock in active warehouses | Products at or below reorder level appear; available quantity excludes reservations and inactive warehouses; suggested quantity is the gap to reorder level, not a demand forecast |

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
| 1.7.2.4 | Post sales invoice to journal | Search by invoice number in Post sales invoice → choose an eligible result showing date, currency, total, and status → choose accounts/date → confirm | Selected invoice posts and the resulting journal opens; Draft, Cancelled, and already-posted invoices are not selectable |
| 1.7.2.5 | Post purchase invoice to journal | Search by invoice number in Post purchase invoice → choose an eligible contextual result → choose accounts/date → confirm | Selected invoice posts and the resulting journal opens; Draft, Cancelled, and already-posted invoices are not selectable |
| 1.7.2.6 | Reverse a posted journal | Open a Posted row → review journal number and source context → set reversal date → Reverse → confirm | A reversal is created for the selected journal; no journal GUID is entered or displayed |

#### 1.7.3 Fiscal Periods

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.7.3.1 | Create fiscal period | Fiscal Periods → Add → enter name + start/end date → Save | Period created |
| 1.7.3.2 | Overlap detection | Create period overlapping existing dates | Error: overlapping period |
| 1.7.3.3 | Close period | Open period → Close | Status changes to Closed |
| 1.7.3.4 | Calendar status view | Fiscal Periods → Calendar → navigate between months | Every covered date shows the fiscal-period code and Open/Closed status; List view remains available for management actions |
| 1.7.3.5 | Warn before posting in a closed period | Journals → set manual, invoice-posting, or reversal date inside a closed period | Warning names the closed period and the corresponding post/reverse action is disabled |
| 1.7.3.6 | Warn when posting date has no period | Journals → set posting or reversal date outside configured periods | Warning explains no period covers the date and the corresponding action is disabled |
| 1.7.3.7 | Overlapping-period date guard | Configure overlapping periods and choose a date in the overlap | Warning identifies ambiguous coverage and blocks posting until the overlap is resolved |

#### 1.7.4 Reports

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.7.4.1 | View Balance Sheet | Reports → Balance Sheet | Assets = Liabilities + Equity |
| 1.7.4.2 | View P&L | Reports → Profit & Loss | Revenue, expenses, and net income shown |
| 1.7.4.3 | View Cash Flow | Reports → Cash Flow | Cash flow categories shown |
| 1.7.4.4 | View AR Aging | Reports → AR Aging | Aging buckets match dashboard values |
| 1.7.4.5 | Review multi-currency aging | Seed/open balances in at least two currencies → open A/R or A/P aging | Totals remain separate by currency; no unlike currencies are added together |
| 1.7.4.6 | Compare periods | Enable Comparative prior period on P&L and Balance Sheet | Current, prior, and variance amounts are formatted consistently; date boundaries are visible |
| 1.7.4.7 | Export comparative reports | With comparison enabled, export P&L and Balance Sheet CSV | Each export includes its prior-period summary and variance rows |
| 1.7.4.8 | Drill into report lines | Select a P&L or Balance Sheet account, filter/sort entries, and export | Dates and signed amounts are locale-formatted; empty drill-down and statement sections explain that no data matched |
| 1.7.4.9 | Empty report state | Use a date with no posted activity | Aging, trial balance, P&L, Balance Sheet, and drill-down show explicit no-data explanations rather than unexplained zeros or blank tables |
| 1.7.4.10 | Reconcile populated statements and exports | Post balanced opening, revenue, and expense journals; compare trial balance, P&L, balance sheet, account drill-down, and their CSV exports | Trial debits equal credits; assets equal liabilities plus equity and earnings; drill-down and CSV figures agree with report lines and totals, including comparative summaries and variances |
| 1.7.4.11 | Inclusive posting dates and tenant isolation | Add activity on both period endpoints, just outside the range, in Draft, and under another tenant; request a foreign account drill-down/export | Period reports include both endpoints; cumulative reports include earlier posted activity but not future/Draft/foreign activity; foreign account requests return 404 |
| 1.7.4.12 | Aging cutoff boundaries | Use outstanding invoices due tomorrow/today and 1/30/31/60/61/90/91 days ago; include partial payments, A/R applied credits, Draft/Cancelled/paid, and foreign-tenant invoices | Current, 1-30, 31-60, 61-90, and over-90 buckets use the correct inclusive cutoffs and outstanding amounts; excluded invoices do not contribute; totals reconcile with current-open-balance dashboard metrics, not historical balances or FX conversion |
| 1.7.4.13 | CSV formula safety | Export all four financial reports with account codes/names or journal numbers/descriptions beginning with =, +, -, @, whitespace/control-prefixed formulas, and embedded CSV delimiters | Formula-like text is prefixed with an apostrophe; commas, quotes, CR, and LF remain correctly escaped; numeric report amounts remain numeric |

FEAT-FIN-02 local validation (26 October 2026): report endpoint integration/authorization checks passed 39/39, reporting service checks 37/37, and report handler checks 8/8. Populated endpoint fixtures use the EF InMemory test host; nine hostile-text cases cover all four export endpoints. No new browser or PostgreSQL-backed run was performed. These checks do not replace the release gate.

---

### 1.8 Audit Logs

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.8.1 | View audit log | Audit Logs page | Log entries with user, action, timestamp |
| 1.8.2 | Create/edit action is logged | Perform any create/update → check audit log | Entry recorded with correct user and action |
| 1.8.3 | Inspect audit event details | Open Details on a row | Actor, entity, event description, and correlation ID are readable; metadata is grouped into safe before/after/context; sensitive keys are redacted |
| 1.8.4 | Find related events by trace | Open an event → Filter this trace | List reloads with the correlation ID filter and only matching tenant events |
| 1.8.5 | Filter and paginate audit history | Set date/event/entity filters; move between pages | Filtered result count, ordered page, and visible entries stay consistent |
| 1.8.6 | Export audit page | Apply filters and Export this page CSV | CSV contains the visible page and safe metadata; formula-like values are neutralized |

Acceptance (26 October 2026): the user confirmed the Audit Logs browser check passes after the responsive filter layout and translated Reset Filters fixes. UX-FIN-04 is complete. Focused automated checks passed (3 files, 4 tests), along with TypeScript, scoped ESLint, and `git diff --check`. This records local and manual browser validation, not the release gate.

---

### 1.9 Customers & Suppliers

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.9.1 | Create customer | Customers → Add → name + contact → Save | Customer available in sales forms |
| 1.9.2 | Edit customer | Edit name/email → Save | Updated |
| 1.9.3 | Create supplier | Suppliers → Add → name + contact → Save | Supplier available in purchase forms |
| 1.9.4 | Duplicate email detection | Create customer with already-used email | Error shown |

---

### 1.10 Project Details

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.10.1 | Accessible project sections | Open a project and visit Overview, Parties, Assignments, Documents, and History | Five localized tabs select the corresponding named panel; only the active panel is visible and exposed to assistive technology |
| 1.10.2 | Keyboard tab navigation | Focus a project tab; use arrow keys, Home/End, and Enter/Space | Focus moves between tabs; activation selects the matching panel and updates the selected state |
| 1.10.3 | Retain section state | Change document folder/filter/selection or assignment list state, switch sections, and return; separately edit a record and attempt to dismiss its dialog | Switching tabs does not remount visited panels or erase retained state; dirty edit dialogs still require their existing discard confirmation, and navigation-away guards remain in effect |
| 1.10.4 | Isolate project detail state | Visit Documents or Assignments, then navigate to a different project | Overview is selected for the new project; previous project panel state and records are not reused; unvisited assignment/document panels do not load |
| 1.10.5 | Preserve read-only access and return navigation | Open a project with view-only permission from a filtered project list; visit sections and return to the list | Edit project and party mutation actions remain unavailable; child panel permissions still apply; Back to projects preserves its supplied list destination |
| 1.10.6 | Responsive project tabs | Review at 360, 768, 1024, and 1440 px, including translated labels | Tab navigation scrolls within the page width with usable scroll controls; labels, panels, and actions do not overlap or create document-level horizontal overflow |
| 1.10.7 | Document toolbar and folder controls | Open Documents with folders present; review wide and narrow layouts; use search, status, and folder selection | Desktop folder sidebar stays bounded at 220px; search, status, and Upload align at 40px height with compact corners; narrow layouts stack cleanly without wrapped upload text or page overflow; folder icon actions have accessible names/tooltips and selection/reset still work |
| 1.10.8 | Document Center filter persistence | Set project, category, status, tag, search, and date filters; reload or navigate Back/Forward; reset filters | Values and matching query results follow the URL, inclusive UTC date boundaries are preserved, and Reset clears managed filters without deleting unrelated query parameters |
| 1.10.9 | Open a global result in its project | With project-view permission, use Open in project on a Document Center result | The project opens on Documents with the clicked document selected and its version history loaded; Back to Document Center restores the original filter URL |
| 1.10.10 | Preserve project document context on return | Set a document folder, search, status, and selection; open Document Center; use Back to project | Document Center is initially scoped to that project; return restores the Documents tab and workspace URL values, including the original Back destination for nested trips |
| 1.10.11 | Permission and return-link boundaries | Use a document-view-only account; attempt unknown document IDs or unsafe return destinations | Project navigation is absent without project-view permission; unrecognized document IDs do not fetch versions; external return destinations are ignored in favor of safe local navigation |
| 1.10.12 | Keep latest document context | Change search filters rapidly or switch selected documents while responses are delayed | Older search/version responses cannot overwrite the current view; changing a document clears the prior version rows while its history loads |
| 1.10.13 | Authorized partner relationship picker | With project-manage permission, open Add project partner and search by tenant code/name | Only active, currently valid relationships with active related tenants are offered; already-linked tenant/type pairs are unavailable for creation; selecting an option fills its relationship type and date bounds without entering a GUID |
| 1.10.14 | Bound project partner permissions and dates | Choose a view-only relationship; inspect upload/consultant controls; enter a date outside its validity window | Unavailable permissions cannot be enabled; invalid dates disable submission and show validation; valid input persists the selected IDs and explicit permissions through the existing API |
| 1.10.15 | Partner lookup and tenant boundaries | Use a read-only project user, fail the options request, or request another tenant's project options | Read-only users have no mutation controls or management-only lookup requests; lookup failures disable creation with retry feedback; foreign projects return 404 and missing manage permission returns 403 |
| 1.10.16 | Readable partner identity and legacy scope safety | Review partner rows/edit/delete context; test a legacy scalar, array, or malformed relationship scope | Tenant code/name replaces raw IDs; malformed scopes are not offered as eligible candidates and direct party creation is denied without an internal error |

UX-PROJ-01 acceptance (26 October 2026): the user confirmed manual browser validation is green, including the refined Documents layout. UX-PROJ-01 is complete. The initial Main UI suite passed 309/309, including four focused tab regressions; project/locale/unsaved-change checks passed 27/27. Typecheck, scoped lint, and production build passed with the existing chunk-size warning. Updated project E2E selectors passed discovery only; no authenticated E2E workflows were run. This is local and manual browser validation, not the release gate.

Documents-layout follow-up (26 October 2026): project/locale regressions pass 23/23, including a new folder-control accessibility/selection test; typecheck and production build pass. Scoped lint passes only with the pre-existing ref-during-render rule findings excluded. Read-only authenticated browser checks on an isolated preview confirmed the bounded sidebar, 40px upload height, 6px control corners, and no page overflow at observed wide/narrow widths. The shared browser viewport changed during inspection, so those automated checks are not a completed fixed-viewport acceptance matrix; the user subsequently confirmed manual browser acceptance is green.

UX-PROJ-02 acceptance (26 October 2026): the user confirmed manual browser validation is green; UX-PROJ-02 is complete. Main UI suite passes 326/326; typecheck, scoped lint, and production build pass with the existing chunk-size warning and the documented DocumentsPanel ref-rule exclusion. An authenticated read-only scripted round trip opened the selected document from Document Center and restored the original project/search URL and input value on return. A native file chooser was active during those scripted checks, so links were activated through dispatched events; no complete automated pointer/keyboard or storage lifecycle E2E was run, and no business records were modified by those checks. This records local and user-confirmed manual browser validation, not the release gate.

---

### 1.11 Tenant Relationships

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.11.1 | Search authorized tenant choices | Open New relationship with tenant view/manage permission and search by tenant code/name | Current tenant is excluded; inactive tenants are disabled; a valid active tenant is required for Create; labels do not require tenant GUID entry |
| 1.11.2 | Named relationship permissions | Select a tenant; review and change document-view, document-upload, and consultant permissions; create or activate | No JSON editor is shown; new relationships start with explicit denied permissions; selected named controls produce the existing scope JSON payload |
| 1.11.3 | Preserve legacy and custom scope | Edit a legacy empty scope without changing permissions; separately toggle a permission on a scope containing aliases and custom properties | An untouched legacy scope stays null/unrestricted; named edits preserve unrelated scope properties and correctly materialize known permission flags without unintended grants |
| 1.11.4 | Read-only relationship access | Open the relationship page with tenant-view permission only | Tenant code/name remains readable; create/edit/activate/delete controls are unavailable; Active only has an accessible switch name |

UX-PROJ-03 acceptance (26 October 2026): the user confirmed manual browser verification is green; UX-PROJ-03 is complete. Main UI suite passes 342/342 with coverage/JUnit; project/relationship endpoint tests pass 37/37 and service tests 8/8. Typecheck, scoped lint, API build, and frontend production build pass with the existing chunk-size warning. Updated cross-tenant E2E scenarios pass discovery only, not execution. Read-only live checks confirmed the new relationship controls and the project lookup's 200/empty state; no business records were changed by those checks and no migration was added. This records local and user-confirmed manual browser validation, not the release gate.

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
| 2.7.1 | Open refund dialog | Open a cashier shift → click Return/Refund | Dialog opens; the action is unavailable without an open shift |
| 2.7.2 | Find original POS sale | Search by invoice number | Original POS invoice and server-calculated remaining quantities are shown; non-POS invoices are rejected |
| 2.7.3 | Reject unfulfilled sale | Search a POS delivery invoice whose shipment is not posted | Return is rejected; no credit note, payment, or stock movement is created |
| 2.7.4 | Partial return to stock | Select a quantity within the remaining amount; choose Return to stock; enter reason; confirm | One refund request creates a linked partial credit note, capped cash refund using the original tender, audit event, and warehouse inventory movement |
| 2.7.5 | Partial return write-off | Select a quantity within the remaining amount; choose Write off; confirm | Credit/refund is recorded; stock is not increased and no return-to-stock movement is written |
| 2.7.6 | Unpaid invoice return | Return an eligible item from an unpaid invoice | Credit reduces invoice balance; no cash refund payment is created |
| 2.7.7 | Reject excess quantity | Return more than sold minus prior POS returns | Conflict is shown; no additional records or stock changes are committed |
| 2.7.8 | Unknown outcome recovery | Simulate a lost response after submission; reload/reopen and retry | Same payload and idempotency key are replayed; no duplicate credit note, payment, or inventory movement is created |

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
