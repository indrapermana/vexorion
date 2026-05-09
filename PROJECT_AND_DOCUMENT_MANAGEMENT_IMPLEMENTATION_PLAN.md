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
- [ ] Add `ProjectCategory` entity and configuration
- [ ] Add `Project` entity and configuration
- [ ] Add `ProjectParty` entity (links project and tenant with role)
- [ ] Add `TenantRelationship` entity and configuration
- [ ] Add `Employee` entity and configuration
- [ ] Add `Consultant` entity and configuration
- [ ] Add `ProjectAssignment` entity and configuration
- [ ] Add `DocumentFolder` entity and configuration
- [ ] Add `Document` entity and configuration
- [ ] Add `DocumentVersion` entity and configuration
- [ ] Add `DocumentAccessPolicy` entity and configuration
- [ ] Add `TenantPlan` entity and configuration
- [ ] Add `StorageUsageLedger` entity and configuration
- [ ] Add `StorageUsageSummary` entity and configuration
- [ ] Add `TenantModuleConfig` entity and configuration

### 1.2 Persistence and Migrations
- [ ] Register new DbSets in `AppDbContext`
- [ ] Add EF Core configurations and indexes
- [ ] Create migration(s) for all new entities
- [ ] Seed baseline data for statuses and relationship types
- [ ] Add migration rollout notes

### 1.3 Backend Service Layer
- [ ] Add command/query services for ProjectCategory
- [ ] Add command/query services for Project
- [ ] Add command/query services for TenantRelationship
- [ ] Add command/query services for Employee and Consultant
- [ ] Add command/query services for ProjectAssignment
- [ ] Add command/query services for Document and DocumentVersion
- [ ] Add service for storage usage calculations and enforcement
- [ ] Add service for module enablement checks
- [ ] Add service for tenant-scoped authorization checks
- [ ] Register all services in DI

### Deliverables
- [ ] Build passes
- [ ] Database migration applies cleanly
- [ ] Baseline API endpoints compile and return expected shapes

## Phase 2: Project Management Module

### 2.1 APIs
- [ ] Add CRUD endpoints for ProjectCategory
- [ ] Add CRUD endpoints for Project
- [ ] Add endpoint to add/remove ProjectParty
- [ ] Add endpoint to list projects with tenant + status filters
- [ ] Add endpoint for project history timeline

### 2.2 Business Rules
- [ ] Enforce tenant ownership for project creation
- [ ] Enforce valid project status transitions
- [ ] Enforce only authorized relationship tenants can be linked as parties
- [ ] Enforce audit event for create/update/status changes

### 2.3 Frontend (UI/AdminUI)
- [ ] Add Project Category pages and forms
- [ ] Add Project list page with filters
- [ ] Add Project detail page with tabs (Overview, Parties, Assignments, Documents, History)
- [ ] Add Project create/edit dialogs
- [ ] Add Project timeline/history panel

### Deliverables
- [ ] User can create and manage projects and categories
- [ ] User can view project history in detail

## Phase 3: Document Management Module

### 3.1 APIs
- [ ] Add document folder CRUD endpoints
- [ ] Add document metadata CRUD endpoints
- [ ] Add upload endpoint with storage accounting
- [ ] Add new version endpoint
- [ ] Add download endpoint
- [ ] Add document status transition endpoint
- [ ] Add document search endpoint (project/category/date/status/tags)

### 3.2 Business Rules
- [ ] Enforce storage quota before upload/version creation
- [ ] Enforce max file size per tenant plan
- [ ] Enforce access policy by tenant relationship scope
- [ ] Enforce audit events for upload/download/update/delete
- [ ] Enforce immutable version history

### 3.3 Frontend (UI/AdminUI)
- [ ] Add Document center page
- [ ] Add Project Documents tab with folder tree
- [ ] Add upload and new version dialogs
- [ ] Add metadata editor (tags, reference numbers, agency)
- [ ] Add status workflow controls and history panel
- [ ] Add file preview/download actions

### Deliverables
- [ ] Tenant A can upload, version, and track project documents
- [ ] Tenant A can view full document and submission history

## Phase 4: Employee and Consultant Management

### 4.1 APIs
- [ ] Add Employee CRUD endpoints
- [ ] Add Consultant CRUD endpoints
- [ ] Add assignment endpoints (assign/unassign)
- [ ] Add endpoint for assignment history per project

### 4.2 Business Rules
- [ ] Enforce assignment date overlap rules
- [ ] Enforce project-role constraints
- [ ] Enforce tenant scope for employee records
- [ ] Enforce cross-tenant assignment only when relationship permits

### 4.3 Frontend
- [ ] Add Employee master data page
- [ ] Add Consultant master data page
- [ ] Add project assignment matrix UI
- [ ] Add assignment timeline/history UI

### Deliverables
- [ ] Tenant A can assign internal employees and external consultants to projects

## Phase 5: Tenant Relationship and Access Control

### 5.1 APIs
- [ ] Add TenantRelationship CRUD endpoints
- [ ] Add relationship approval/activation endpoint
- [ ] Add permission-scope update endpoint
- [ ] Add endpoint to list active relationships by tenant

### 5.2 Security Rules
- [ ] Enforce no cross-tenant data access without active relationship
- [ ] Enforce per-scope permission checks (view/upload/assign/manage)
- [ ] Enforce relationship validity period
- [ ] Enforce audit event for all access-denied and access-granted decisions (where applicable)

### 5.3 Frontend
- [ ] Add Tenant Relationship management page
- [ ] Add relationship scope editor UI
- [ ] Add relationship lifecycle status UI

### Deliverables
- [ ] Controlled collaboration between Tenant A and Tenant B/C is functioning

## Phase 6: Pricing Tier, Storage Usage, and Tenant Management

### 6.1 Tenant Plan and Module Enablement
- [ ] Add TenantPlan management in Tenant Management
- [ ] Add module toggle controls per tenant (enable Project/Document/Employee)
- [ ] Enforce module toggles in backend authorization
- [ ] Enforce module toggles in frontend navigation and route guards

### 6.2 Storage Usage Tracking and Display
- [ ] Add storage usage summary endpoint per tenant
- [ ] Add storage usage trend endpoint (daily/monthly)
- [ ] Add top consuming project/documents endpoint
- [ ] Add admin dashboard cards for storage usage and quota
- [ ] Add warning/soft block/hard block indicators

### 6.3 Billing Readiness
- [ ] Add export/report endpoint for storage usage period
- [ ] Add plan limit change audit log

### Deliverables
- [ ] SystemAdmin can monitor storage usage and manage pricing tiers
- [ ] Tenant storage limits are enforced and visible

## Phase 7: Testing, Quality, and Hardening

### 7.1 Backend Tests
- [ ] Unit tests for project workflow rules
- [ ] Unit tests for document versioning rules
- [ ] Unit tests for quota enforcement
- [ ] Unit tests for tenant relationship scope checks
- [ ] Integration tests for cross-tenant permission boundaries

### 7.2 Frontend Tests
- [ ] Unit tests for project forms and state
- [ ] Unit tests for document upload/version UI logic
- [ ] Unit tests for assignment and relationship UI logic

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
- Overall completion: 0%
- Current phase: Phase 0
- Target MVP cutoff: End of Phase 4

### Weekly Tracking Log
- Week 1:
  - Focus:
  - Completed:
  - Blockers:
- Week 2:
  - Focus:
  - Completed:
  - Blockers:
- Week 3:
  - Focus:
  - Completed:
  - Blockers:

## MVP Definition (Recommended)
MVP is complete when all items below are done:
- [ ] Project and Project Category CRUD with history
- [ ] Document upload + versioning + access control
- [ ] Employee and consultant assignment
- [ ] Basic TenantRelationship and scoped collaboration
- [ ] Tenant plan and storage quota enforcement
- [ ] Tenant storage usage visibility in Tenant Management
- [ ] Core tests for permissions and storage rules
