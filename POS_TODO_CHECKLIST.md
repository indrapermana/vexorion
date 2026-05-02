# POS Todo Checklist

Track progress by checking each item as it is completed.

## A. Receipt and Reprint
- [ ] 1. Add post-checkout receipt preview modal.
- [ ] 2. Implement browser print layout optimized for thermal paper.
- [ ] 3. Include order, shipment, invoice, and payment references on receipt.
- [ ] 4. Add reprint action from transaction history panel.

## B. Shift and Cash Control
- [ ] 5. Add shift open flow with opening cash float input.
- [ ] 6. Add shift close flow with counted cash input.
- [ ] 7. Build end-of-shift summary (sales, tenders, discounts, taxes).
- [ ] 8. Add variance report (expected cash vs counted cash).

## C. Return and Refund
- [ ] 9. Add invoice search for return initiation.
- [ ] 10. Support partial line returns by quantity.
- [ ] 11. Auto-create credit note and refund payment records.
- [ ] 12. Capture mandatory return/refund reason and actor audit trail.

## D. Inventory and Oversell Protection
- [ ] 13. Revalidate stock at checkout submission on server side.
- [ ] 14. Show low-stock warning for cart lines before payment.
- [ ] 15. Show conflict message when stock changed concurrently.
- [ ] 16. Add retry flow that refreshes stock and preserves cart.

## E. Barcode and Speed UX
- [ ] 17. Add focused scan input mode (barcode keyboard wedge).
- [ ] 18. Resolve barcode/SKU to product and auto-add to cart.
- [ ] 19. Add quick quantity override shortcuts for cashier speed.
- [ ] 20. Add keyboard shortcuts for checkout, payment method, and remove line.

## F. Reliability and Observability
- [ ] 21. Add global error boundary for POS runtime failures.
- [ ] 22. Add API retry strategy for transient errors and network drops.
- [ ] 23. Add structured client-side logs for checkout failures.
- [ ] 24. Add telemetry for checkout latency and failure reasons.

## G. Permissions and Security
- [ ] 25. Define dedicated POS permissions (checkout, refund, reprint, shift close).
- [ ] 26. Enforce backend authorization per POS action endpoint.
- [ ] 27. Add session timeout warning and safe logout flow.
- [ ] 28. Add restricted-route guard to block non-permitted POS admin actions.

## H. Product Images (Azure Blob)
- [x] 29. Add product image management with Azure Blob Storage using tenantId as root folder prefix (for example: {tenantId}/products/{productId}/{filename}).
