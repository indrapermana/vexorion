# ClamAV Cost Analysis and Deferral Decision

Analysis date: 26 October 2026. Currency: USD.

## Current Decision

The owner deferred malware scanning until all other unfinished project work is complete. Remove scanning from document uploads and version uploads now; redesign the feature from scratch at the final project stage. Do not deploy a production scanner or change billing entitlements based on this analysis.

The upload validator no longer resolves or invokes a malware scanner. Legacy `RequireMalwareScan`/`ClamAv` settings do not activate scanning. Standalone prototype code and local Compose files are dormant reference material, not active upload protection or an approved future architecture. The local prototype container was stopped without deleting its signature volume.

Retained controls: empty-file rejection, absolute size limits, allowed file types and content signatures, canonical MIME detection, tenant authorization, and storage quotas. These controls are not a substitute for malware scanning. Do not describe uploaded files as scanned, malware-free, or clean.

## Resource Baseline

- Current API runbook region: Jakarta, `asia-southeast2` (Cloud Run Tier 2 pricing).
- Scanner prototype: 2 vCPU and 4 GiB RAM.
- ClamAV recommends at least 3 GiB RAM, preferably 4 GiB. Signature reloads temporarily use additional memory; larger files, concurrency, and an HTTP wrapper need headroom.
- A 1-vCPU/4-GiB Cloud Run service is supported, but throughput and startup latency must be benchmarked before choosing it.

## Cloud Run Service Estimates

Assumptions: 30 days (2,592,000 seconds), on-demand Jakarta list prices, one scanner instance. Excludes free-tier credits, taxes, networking, signature storage/distribution, image builds, logs, queueing, engineering, and support.

| Resource | Request-based active rate | Instance-based rate |
|---|---:|---:|
| CPU, per vCPU-second | $0.0000336 | $0.0000216 |
| Memory, per GiB-second | $0.0000035 | $0.0000024 |

For a 2-vCPU/4-GiB request-based service, active compute costs $0.0000812 per instance-second.

| Scenario | Estimated compute cost |
|---|---:|
| 1,000 scans at five active seconds each | $0.41 |
| 10,000 scans at five active seconds each | $4.06 |
| 100,000 scans at five active seconds each | $40.60 |
| Additional 1,000 cold starts at 60 seconds each | $4.87 |
| Continuously allocated CPU, 1 vCPU/4 GiB, 30 days | $80.87 |
| Continuously allocated CPU, 2 vCPU/4 GiB, 30 days | $136.86 |

The five-second scan and 60-second startup values are modelling assumptions, not measured production performance. Startup/shutdown time is billed. Request fees are additional ($0.40 per million requests before allowances). Parallel requests can share instance time, so request count multiplied by latency is only a simple low-concurrency model.

Free-tier credits are shared across the billing account and applied using Tier 1-equivalent pricing. A separate scanner does not receive a fresh independent free allowance. Actual remaining credits and invoice costs were not inspected.

## Deployment Tradeoffs

- Scale-to-zero service: low idle cost, but engine/signature loading adds latency and cost. Request-based CPU allocation cannot be relied on for background FreshClam updates outside requests. Signature freshness and readiness must be explicitly designed.
- Warm service: predictable response time and background work with instance-based billing, but a fixed baseline bill. Minimum-instance request-based idle pricing is not an adequate substitute for reliable background CPU allocation.
- Private Compute Engine VM: persistent signatures and native TCP fit ClamAV, but require a regional quote for compute, disk, external IPv4 or NAT, maintenance, and availability. A small free-tier VM is not an appropriate 4-GiB scanner baseline.
- Other Cloud Run resource types, such as worker pools or instances, have different pricing and networking contracts; compare their availability and lifecycle limits when revisiting. The estimates above are for Cloud Run services, not those products.

A normal Cloud Run service requires an HTTP/gRPC ingress wrapper and authenticated service-to-service calls; the current raw ClamAV TCP adapter cannot call that service directly. Never expose unauthenticated `clamd` port 3310 publicly. A private VM can instead use private VPC connectivity, with Direct VPC egress avoiding a separately billed connector fleet; networking costs still require a quote.

For asynchronous scanning, quarantine documents and prevent preview/download until a successful result. That requires new workflow/state handling; the existing synchronous pipeline does not already implement it. Account for API waiting time if using synchronous scans, signature updates, retries, and large/complex archives when benchmarking.

## Paid-Plan Proposal, Not Implemented

Use one shared scanner across tenants rather than a dedicated instance per customer. An illustrative $150/month scanner infrastructure budget allocates as follows:

| Paying tenants | Infrastructure allocation per tenant/month |
|---|---:|
| 5 | $30.00 |
| 20 | $7.50 |
| 50 | $3.00 |
| 100 | $1.50 |

A possible $10-15/month security add-on should include bounded file counts and scanned bytes, count new versions, and cap archive complexity. At $10/month, 15 tenants cover a $150 infrastructure budget only, not engineering, support, other application costs, taxes, or profit. These are planning examples, not approved prices or a measured capacity commitment.

Future design must define tenant entitlements, quotas, scan status, freshness, retries, and outage behavior. Paid-plan scanner failures or quota exhaustion must not silently bypass required scanning. Decide explicitly whether free tenants receive a small scan allowance or restricted upload functionality. Do not assume the former global scan flag supplies tenant-specific billing behavior.

## Revisit Gate

Resume `FEAT-PROJ-01` only after all other unfinished project work is complete. Recheck current regional SKUs and vendor documentation; benchmark actual upload sizes, active scan time, cold-start frequency, signature reload memory, and concurrent demand; approve the commercial policy; then implement and validate a new design. No production resources were provisioned or changed for this analysis.

## Sources

- [Cloud Run pricing](https://cloud.google.com/run/pricing): Jakarta rates and billing-account free-tier aggregation.
- [Cloud Run billing settings](https://docs.cloud.google.com/run/docs/configuring/billing-settings): request/instance billing and background CPU allocation.
- [Cloud Run memory limits](https://docs.cloud.google.com/run/docs/configuring/services/memory-limits).
- [Cloud Run container contract](https://docs.cloud.google.com/run/docs/reference/container-contract): ingress, startup, and ephemeral filesystem behavior.
- [Direct VPC egress](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc).
- [Google Cloud networking pricing](https://cloud.google.com/vpc/network-pricing): connector, IPv4, NAT, and transfer charges.
- [ClamAV Docker documentation](https://docs.clamav.net/manual/Installing/Docker.html): memory, signature persistence, and raw TCP limitations.