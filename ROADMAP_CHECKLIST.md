# VexorionERP Roadmap Checklist

## 1. Frontend Unit Testing (POS — Vitest)

### 1a. Setup
- [x] 1. Install vitest, @vitest/coverage-v8, @testing-library/react, @testing-library/user-event, jsdom.
- [x] 2. Add vitest config block to vite.config.ts (test: environment jsdom, setupFiles, coverage).
- [x] 3. Add test:unit and test:coverage scripts to package.json.
- [x] 4. Create src/test/setup.ts (jsdom mocks: window.matchMedia, localStorage, crypto.randomUUID, posLogger).

### 1b. Pure logic / utility tests
- [x] 5. posLogger — ring buffer capped at 200, all three levels, DevTools accessor.
- [x] 6. printReceipt — escapeHtml sanitises XSS chars, subtotal/discount/change math, refs format.
- [x] 7. generateDocumentNumber (PosPage helper) — format PREFIX-YYYYMMDDHHMMSS, unique outputs.
- [x] 8. i18n translations — all TranslationKeys present in enUS, idID, esES; no missing keys.

### 1c. Zustand store tests
- [x] 9.  shiftStore — openShift sets all fields, id is unique per call, closeShift nulls currentShift.
- [x] 10. transactionHistoryStore — push prepends, capped at 10, clear empties, shiftId threaded.

### 1d. Component tests
- [x] 11. ShiftOpenDialog — renders when !isShiftOpen, validates float ≥ 0, Enter submits, calls onOpen.
- [x] 12. ShiftCloseDialog — computes totalSales/expectedCash from fixture transactions, variance chip colour.
- [x] 13. ReturnRefundDialog — search step renders, notFound alert shown, back button returns to search step.
- [x] 14. ReceiptModal — renders all line rows, shows change, hides reprint when canReprint=false.
- [x] 15. PosHeader — shows "Return / Refund" button only when canRefund=true; shift chip colour.

## 2. Frontend Unit Testing (AdminUI — Vitest)
- [x] 16. Mirror setup (install, vitest config, setup.ts) in AdminUI project.
- [x] 17. Shared utility / hook tests (date formatters, permission guards, API error helpers).
- [x] 18. Key form component tests (create/edit dialogs — required fields, submit calls, cancel).

## 3. Frontend Unit Testing (UI component library — if exists)
- [x] 19. Identify shared UI package; add vitest if separate from AdminUI/POS.
- [x] 20. Snapshot tests for design-system primitives (buttons, chips, inputs).

## 4. E2E — Playwright (POS cashier journey)
- [x] 21. Install Playwright, add e2e/ directory, configure baseURL and auth fixture.
- [x] 22. Login → open shift → add product to cart → checkout → receipt modal visible.
- [x] 23. Reprint from transaction history panel.
- [x] 24. Return flow — search invoice → partial lines → submit → success message.
- [x] 25. Shift close — enter counted cash → variance chip → confirm close.
- [x] 26. Permission guard — user without pos.refund cannot see Return button.

## 5. Backend Enhancements
- [x] 27. Dedicated credit note endpoint (POST /api/sales-invoices/{id}/credit-note) — negates lines, links original invoice.
- [x] 28. Shift persistence — ShiftSession table (tenantId, cashierId, openedAt, closedAt?, openingFloat, countedCash?, notes?).
- [x] 29. Shift API (POST /api/pos/shifts/open, POST /api/pos/shifts/close, GET /api/pos/shifts/current).
- [x] 30. Migrate POS frontend shiftStore from localStorage to backend shift API.

## 6. CI/CD — GitHub Actions
- [ ] 31. Backend workflow: dotnet build → dotnet test → on push to main/develop.
- [ ] 32. POS frontend workflow: npm ci → tsc -b → vitest run → vite build → on push.
- [ ] 33. AdminUI workflow: same pattern as POS.
- [ ] 34. PR status checks — block merge if any workflow fails.
- [ ] 35. Coverage report artifact upload (lcov → GitHub summary comment).

## 7. Production Hardening
- [ ] 36. Bundle splitting — dynamic import() for POS route, AdminUI route, and MUI icons.
- [ ] 37. Content Security Policy (CSP) headers on the ASP.NET backend (Helmet equivalent).
- [ ] 38. HTTPS enforcement — HSTS header, redirect HTTP → HTTPS in Program.cs.
- [ ] 39. API rate limiting — AddRateLimiter middleware (fixed window per tenant/IP).
- [ ] 40. Structured backend logging — Serilog + seq/Application Insights sink.
