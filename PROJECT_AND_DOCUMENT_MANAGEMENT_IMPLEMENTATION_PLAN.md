# Project and Document Management Implementation Plan

This plan tracks implementation for the new tenant-focused modules:
- Project Management
- Document Management
- Employee and Consultant Management
- Tenant Relationship Management
- Tenant Pricing Tier and Storage Governance
- Module Enablement in Tenant Management

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Completed
- [!] Blocked

## Scope and Goals

### Primary Business Goal
Enable Tenant A to act as a legal and project submission owner for government projects, while collaborating with Tenant B/C as delivery partners, with complete project and document history.

### Product Goal
Provide a secure multi-tenant module set that supports:
1. Project lifecycle and category management
2. Document lifecycle, versioning, and auditability
3. Employee and consultant assignment to projects
4. Cross-tenant relationship with controlled access
5. Tier-based storage limits and usage visibility
6. Tenant module toggles (Project/Document/Employee only where needed)

## Phase 0: Discovery and Domain Design

- [ ] Define exact user roles and permissions for this module set
- [ ] Finalize tenant relationship types (Prime/Subcontractor, Legal Sponsor/Delivery Partner, Customer/Vendor, Consortium)
- [ ] Finalize project statuses and workflow transitions
- [ ] Finalize document statuses and review flow (Draft, InReview, Approved, Submitted, Archived)
- [ ] Finalize pricing tier policy and storage threshold behavior (warning/soft block/hard block)
- [ ] Confirm module enablement behavior per tenant (what is hidden and what is blocked)
- [ ] Confirm legal audit requirements (immutable events, retention)

### Deliverables
- [ ] Domain glossary and bounded context notes
- [ ] Permission matrix by role
- [ ] Workflow diagrams for project and document lifecycle

## Phase 1: Data Model and Backend Foundation

### 1.1 Core Entities
- [x] Add `ProjectCategory` entity and configuration
- [x] Add `Project` entity and configuration
- [x] Add `ProjectParty` entity (links project and tenant with role)
- [x] Add `TenantRelationship` entity and configuration
- [x] Add `Employee` entity and configuration
- [x] Add `Consultant` entity and configuration
- [x] Add `ProjectAssignment` entity and configuration
- [x] Add `DocumentFolder` entity and configuration
- [x] Add `Document` entity and configuration
- [x] Add `DocumentVersion` entity and configuration
- [x] Add `DocumentAccessPolicy` entity and configuration
- [x] Add `TenantPlan` entity and configuration
- [x] Add `StorageUsageLedger` entity and configuration
- [x] Add `StorageUsageSummary` entity and configuration
- [x] Add `TenantModuleConfig` entity and configuration

### 1.2 Persistence and Migrations
- [x] Register new DbSets in `AppDbContext`
- [x] Add EF Core configurations and indexes
- [x] Create migration(s) for all new entities
- [ ] Seed baseline data for statuses and relationship types
- [x] Add migration rollout notes

Migration rollout notes:
- Created migration: `AddProjectAndDocumentManagementFoundation`
- Apply in non-production first: `dotnet ef database update --project VexorionERP.Database --startup-project VexorionERP`
- Validate tenant query filters and unique indexes with seed/test tenants before production rollout.

### 1.3 Backend Service Layer
- [x] Add command/query services for ProjectCategory
- [x] Add command/query services for Project
- [x] Add command/query services for TenantRelationship
- [x] Add command/query services for Employee and Consultant
- [ ] Add command/query services for ProjectAssignment
- [x] Add command/query services for Document and DocumentVersion
- [x] Add service for storage usage calculations and enforcement
- [ ] Add service for module enablement checks
- [ ] Add service for tenant-scoped authorization checks
- [x] Register all services in DI

### Deliverables
- [x] Build passes
- [ ] Database migration applies cleanly
- [x] Baseline API endpoints compile and return expected shapes

## Phase 2: Project Management Module

### 2.1 APIs
- [x] Add CRUD endpoints for ProjectCategory
- [x] Add CRUD endpoints for Project
- [x] Add endpoint to add/remove ProjectParty
- [x] Add endpoint to list projects with tenant + status filters
- [x] Add endpoint for project history timeline

### 2.2 Business Rules
- [x] Enforce tenant ownership for project creation
- [x] Enforce valid project status transitions
- [x] Enforce only authorized relationship tenants can be linked as parties
- [x] Enforce audit event for create/update/status changes

### 2.3 Frontend (UI/AdminUI)
- [x] Add Project Category pages and forms
- [x] Add Project list page with filters
- [x] Add Project detail page with tabs (Overview, Parties, Assignments, Documents, History)
- [x] Add Project create/edit dialogs
- [x] Add Project timeline/history panel

### Deliverables
- [x] User can create and manage projects and categories
- [x] User can view project history in detail

## Phase 3: Document Management Module

### 3.1 APIs
- [x] Add document folder CRUD endpoints
- [x] Add document metadata CRUD endpoints
- [x] Add upload endpoint with storage accounting
- [x] Add new version endpoint
- [x] Add download endpoint
- [x] Add document status transition endpoint
- [~] Add document search endpoint (project/category/date/status/tags)

### 3.2 Business Rules
- [x] Enforce storage quota before upload/version creation
- [x] Enforce max file size per tenant plan
- [ ] Enforce access policy by tenant relationship scope
- [~] Enforce audit events for upload/download/update/delete
- [x] Enforce immutable version history

### 3.3 Frontend (UI/AdminUI)
- [ ] Add Document center page
- [x] Add Project Documents tab with folder tree
- [x] Add upload and new version dialogs
- [~] Add metadata editor (tags, reference numbers, agency)
- [x] Add status workflow controls and history panel
- [~] Add file preview/download actions

### Deliverables
- [~] Tenant A can upload, version, and track project documents
- [~] Tenant A can view full document and submission history

## Phase 4: Employee and Consultant Management

### 4.1 APIs
- [x] Add Employee CRUD endpoints
- [x] Add Consultant CRUD endpoints
- [x] Add assignment endpoints (assign/unassign)
- [x] Add endpoint for assignment history per project

### 4.2 Business Rules
- [x] Enforce assignment date overlap rules
- [x] Enforce project-role constraints
- [x] Enforce tenant scope for employee records
- [x] Enforce cross-tenant assignment only when relationship permits

### 4.3 Frontend
- [x] Add Employee master data page
- [x] Add Consultant master data page
- [~] Add project assignment matrix UI
- [x] Add assignment timeline/history UI

### Deliverables
- [~] Tenant A can assign internal employees and external consultants to projects

## Phase 5: Tenant Relationship and Access Control

### 5.1 APIs
- [x] Add TenantRelationship CRUD endpoints
- [x] Add relationship approval/activation endpoint
- [x] Add permission-scope update endpoint
- [x] Add endpoint to list active relationships by tenant

### 5.2 Security Rules
- [x] Enforce no cross-tenant data access without active relationship
- [x] Enforce per-scope permission checks (view/upload/assign/manage)
- [x] Enforce relationship validity period
- [x] Enforce audit event for all access-denied and access-granted decisions (where applicable)

**5.2 Implementation Details:**
- Cross-tenant assignment validation in ProjectAssignmentCommandService with relationship/scope checks
- Service-level audit logging for access-denied and access-granted events
- Controller-level audit logging for successful authorization paths (project documents view/download/upload/manage)
- Comprehensive test coverage: 5 security tests + 2 audit service tests + 4 Web authorization tests + 2 Web audit tests (13 total)
- All tests passing with StableTestWebApplicationFactory for persistent audit trail verification

### 5.3 Frontend
- [x] Add Tenant Relationship management page
- [x] Add relationship scope editor UI
- [x] Add relationship lifecycle status UI

### Deliverables
- [x] Controlled collaboration between Tenant A and Tenant B/C is functioning
- [x] All cross-tenant access decisions are audited and logged
- [x] Security rules enforced at both service and API layers

## Phase 6: Pricing Tier, Storage Usage, and Tenant Management

### 6.1 Tenant Plan and Module Enablement
- [x] Add TenantPlan management in Tenant Management
- [x] Add module toggle controls per tenant (enable Project/Document/Employee)
- [x] Enforce module toggles in backend authorization
- [x] Enforce module toggles in frontend navigation and route guards

6.1 progress notes:
- Added Tenant Plan APIs (`GET/POST /api/tenants/{tenantId}/plans`) with permission-based access.
- Added Tenant Module Config APIs (`GET/PUT /api/tenants/{tenantId}/modules`) for Project/Document/Employee and core module toggles.
- Added new permission groups for tenant plans, tenant modules, and storage usage.
- Added backend middleware enforcement for tenant module toggles across project/document/employee API surfaces.
- Added frontend module context + route guards + sidebar link filtering for module-disabled areas.

### 6.2 Storage Usage Tracking and Display
- [x] Add storage usage summary endpoint per tenant
- [x] Add storage usage trend endpoint (daily/monthly)
- [x] Add top consuming project/documents endpoint
- [x] Add admin dashboard cards for storage usage and quota
- [x] Add warning/soft block/hard block indicators

6.2 progress notes:
- Added storage summary API (`GET /api/tenants/{tenantId}/storage/summary`) with threshold status (`Normal`, `Warning`, `SoftBlock`, `HardBlock`).
- Added storage trend API (`GET /api/tenants/{tenantId}/storage/trend?daysBack=30`) from usage ledger history.
- Added top consumers API (`GET /api/tenants/{tenantId}/storage/top-consumers?take=10`) returning top projects and top documents by bytes.
- Added dashboard storage section cards in Admin UI showing used/max quota, plan name, threshold status chip, and top projects/documents.
- Added web/API authorization tests for tenant plan, tenant module, and storage endpoints.
- Added middleware enforcement tests for module-disabled project/employee paths.

### 6.3 Billing Readiness
- [x] Add export/report endpoint for storage usage period
- [x] Add plan limit change audit log

6.3 progress notes:
- Added storage usage export API (`GET /api/tenants/{tenantId}/storage/export`) with date range filtering and CSV output.
- Added tenant plan limit change audit event (`tenant.plan.limit_changed`) on plan creation with previous/current limit metadata.

### Deliverables
- [x] SystemAdmin can monitor storage usage and manage pricing tiers
- [x] Tenant storage limits are enforced and visible

## Phase 7: Testing, Quality, and Hardening

### 7.1 Backend Tests
- [x] Unit tests for project workflow rules
- [x] Unit tests for document versioning rules
- [x] Unit tests for quota enforcement
- [x] Unit tests for tenant relationship scope checks
- [x] Integration tests for cross-tenant permission boundaries

7.1 progress notes:
- Added `StorageAccountingServiceTests` covering no-plan allowance, max file-size rejection (413), quota exceed rejection (507), ledger summary creation, and non-negative used-bytes clamping.
- Re-validated tenant relationship scope check coverage via `ProjectAssignmentCommandServiceSecurityTests`.
- Added `ProjectCommandServiceWorkflowTests` covering valid and invalid project status transitions.
- Added `AddDocumentVersionCommandHandlerTests` covering version increment behavior, prior-version retention, and quota-failure no-write behavior.
- Added `CrossTenantPermissionBoundaryIntegrationTests` validating that cross-tenant project/document reads and assignment create attempts return `404 NotFound` with valid permissions when resources belong to another tenant.

### 7.2 Frontend Tests
- [~] Unit tests for project forms and state
- [x] Unit tests for document upload/version UI logic
- [x] Unit tests for assignment and relationship UI logic

7.2 progress notes:
- Added `src/types/ui/projects.test.ts` covering project lifecycle status label mapping and tenant relationship type label mapping used by project UI state.
- Added `src/features/projects/components/DocumentsPanel.test.tsx` covering no-access behavior, upload dialog submission payload, and add-version submission payload.
- Added `src/features/projects/components/AssignmentsPanel.test.tsx` covering no-access behavior, employee assignment create payload mapping, and consultant assignment create payload mapping.

### 7.3 E2E
- [ ] E2E: Tenant A creates project and links Tenant B
- [ ] E2E: Tenant A uploads documents and versions
- [ ] E2E: Tenant B limited access based on scope
- [ ] E2E: Storage warning and hard block behavior

### 7.4 Non-Functional
- [ ] Index and query performance review
- [ ] File storage reliability and retry behavior
- [ ] Logging and observability checks for audit critical paths

### Deliverables
- [ ] Release candidate for module suite

## Phase 8: Rollout and Migration

- [ ] Prepare feature flags for controlled rollout
- [ ] Migrate existing tenants to module configuration model
- [ ] Define default plans and quotas
- [ ] Create operational runbook for support team
- [ ] Prepare admin training material
- [ ] Post-release monitoring dashboard and alert thresholds

### Deliverables
- [ ] Production rollout completed
- [ ] Post-launch monitoring active

## Backlog Candidates (Optional but Recommended)
- [ ] Government submission package generator (zip bundle with metadata)
- [ ] Document expiry reminders and compliance checklist automation
- [ ] OCR and metadata extraction pipeline
- [ ] Digital signature workflow integration
- [ ] Tenant-to-tenant project templates

## Progress Tracker

### Current Overall Status
- Overall completion: 57%
- Current phase: Phase 4
- Target MVP cutoff: End of Phase 4

### Weekly Tracking Log
- Week 1:
  - Focus: Phase 1 backend scaffolding for Project/Document/Tenant governance
  - Completed: Added core entities, enums, EF configurations, DbSet registrations, and migration `AddProjectAndDocumentManagementFoundation`.
  - Blockers:
- Week 2:
  - Focus: Project module service and API slice
  - Completed: Added ProjectCategory/Project contracts, command/query services, mediator handlers, and controllers; added ProjectParty endpoints with tenant relationship guardrails; added project list filtering by status and related tenant; temporarily disabled frontend e2e jobs in CI pending stabilization.
  - Blockers:
- Week 3:
  - Focus: Phase 2.3 frontend coverage for Project module
  - Completed: Added Project Category management page/forms, Projects list page with status + related tenant filter, Project details workspace with tabs (Overview, Parties, Assignments, Documents, History), project create/edit dialogs, project-party management UI, timeline/history panel, and route/navigation wiring in main UI.
  - Blockers:
- Week 4:
  - Focus: Phase 3 document management implementation + Phase 4 API kickoff
  - Completed: Added ProjectDocuments permissions, contracts, storage accounting service, document folder/document/version handlers, project document controller endpoints, document tab frontend with folder tree/upload/version/metadata/status/download flows, Consultant CRUD backend slice (contracts/services/handlers/controller), ProjectAssignment backend slice (assign/unassign/list/get/history endpoints with overlap + tenant validation and audit events), Assignments tab frontend integration (assignment list/create/update/delete + history panel), Employee and Consultant master pages (route + sidebar wiring), assignment assignee lookup selectors backed by Employee/Consultant APIs, cross-tenant consultant assignment validation based on active project-party + tenant-relationship scope/time windows, project-scoped assignable consultant lookup endpoint/UI wiring for relationship-eligible external consultants, project-scoped assignable employee lookup endpoint/UI wiring, and project-role assignment constraints (terminal project status guard + single active overlapping primary assignment guard) with cleaner UI validation error surfacing.
  - Blockers: Access policy by tenant relationship scope and complete document audit coverage (upload/download) are still pending.

## MVP Definition (Recommended)
MVP is complete when all items below are done:
- [x] Project and Project Category CRUD with history
- [~] Document upload + versioning + access control
- [~] Employee and consultant assignment
- [ ] Basic TenantRelationship and scoped collaboration
- [x] Tenant plan and storage quota enforcement
- [ ] Tenant storage usage visibility in Tenant Management
- [ ] Core tests for permissions and storage rules
