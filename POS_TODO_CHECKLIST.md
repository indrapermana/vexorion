# POS Todo Checklist

Track progress by checking each item as it is completed.

## A. Receipt and Reprint
- [x] 1. Add post-checkout receipt preview modal.
- [x] 2. Implement browser print layout optimized for thermal paper.
- [x] 3. Include order, shipment, invoice, and payment references on receipt.
- [x] 4. Add reprint action from transaction history panel.

## B. Shift and Cash Control
- [x] 5. Add shift open flow with opening cash float input.
- [x] 6. Add shift close flow with counted cash input.
- [x] 7. Build end-of-shift summary (sales, tenders, discounts, taxes).
- [x] 8. Add variance report (expected cash vs counted cash).

## C. Return and Refund
- [x] 9. Add invoice search for return initiation.
- [x] 10. Support partial line returns by quantity.
- [x] 11. Auto-create credit note and refund payment records.
- [x] 12. Capture mandatory return/refund reason and actor audit trail.

## D. Inventory and Oversell Protection
- [x] 13. Revalidate stock at checkout submission on server side.
- [x] 14. Show low-stock warning for cart lines before payment.
- [x] 15. Show conflict message when stock changed concurrently.
- [x] 16. Add retry flow that refreshes stock and preserves cart.

## E. Barcode and Speed UX
- [x] 17. Add focused scan input mode (barcode keyboard wedge).
- [x] 18. Resolve barcode/SKU to product and auto-add to cart.
- [x] 19. Add quick quantity override shortcuts for cashier speed.
- [x] 20. Add keyboard shortcuts for checkout, payment method, and remove line.

## F. Reliability and Observability
- [x] 21. Add global error boundary for POS runtime failures.
- [x] 22. Add API retry strategy for transient errors and network drops.
- [x] 23. Add structured client-side logs for checkout failures.
- [x] 24. Add telemetry for checkout latency and failure reasons.

## G. Permissions and Security
- [x] 25. Define dedicated POS permissions (checkout, refund, reprint, shift close).
- [x] 26. Enforce backend authorization per POS action endpoint.
- [x] 27. Add session timeout warning and safe logout flow.
- [x] 28. Add restricted-route guard to block non-permitted POS admin actions.

## H. Product Images (Azure Blob)
- [x] 29. Add product image management with Azure Blob Storage using tenantId as root folder prefix (for example: {tenantId}/products/{productId}/{filename}).
