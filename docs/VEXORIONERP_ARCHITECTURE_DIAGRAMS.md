# VexorionERP Architecture and Workflow Diagrams

This document describes the implemented VexorionERP architecture as of 21 October 2026. The diagrams use Mermaid so they render in GitHub and can be imported or recreated in Notion.

## Diagram legend

- Solid arrows represent runtime calls or data flow.
- Dashed arrows represent deployment, configuration, or observability flow.
- Cylinders represent persistent storage.
- Cloudflare Pages hosts static frontend assets; business APIs run in Google Cloud Run.
- Cloudflare R2 stores objects, while Neon PostgreSQL stores application records and object metadata.

## 1. Production system context

```mermaid
flowchart LR
    User[ERP user]
    Admin[Platform administrator]
    PosUser[POS operator]

    subgraph CF[Cloudflare]
        Landing[Landing Page<br/>vexorionerp.com]
        MainUI[Main UI<br/>app.vexorionerp.com]
        AdminUI[Admin UI<br/>admin.vexorionerp.com]
        PosUI[POS UI<br/>pos.vexorionerp.com]
        Images[Public product images<br/>images.vexorionerp.com]
        Docs[(Private document bucket)]
        ImageBucket[(Product image bucket)]
    end

    subgraph GCP[Google Cloud production]
        API[ASP.NET Core .NET 10 API<br/>Cloud Run]
        Secrets[Secret Manager]
        Logs[Cloud Logging]
    end

    DB[(Neon PostgreSQL<br/>production)]
    Loki[Grafana Loki]

    User --> Landing
    User --> MainUI
    Admin --> AdminUI
    PosUser --> PosUI
    Landing --> MainUI

    MainUI -->|HTTPS JSON API| API
    AdminUI -->|HTTPS JSON API| API
    PosUI -->|HTTPS JSON API| API
    API -->|Pooled TLS connection| DB
    API -->|S3-compatible API| Docs
    API -->|S3-compatible API| ImageBucket
    MainUI -->|Public HTTPS GET| Images
    Images --> ImageBucket
    Secrets -.->|Runtime secret injection| API
    API -.-> Logs
    API -.-> Loki
```

The API currently uses its Google-managed `run.app` hostname. A separate custom API hostname has not been introduced.

## 2. Repository and application layers

```mermaid
flowchart TB
    subgraph Clients[Frontend workspaces]
        UI[VexorionERP.UI]
        AdminUI[VexorionERP.AdminUI]
        POS[VexorionERP.POS]
        SharedUI[packages/ui]
        SharedUI --> UI
        SharedUI --> AdminUI
        SharedUI --> POS
    end

    subgraph Backend[Backend solution]
        Web[VexorionERP<br/>Controllers and middleware]
        Handler[VexorionERP.Handler<br/>CQRS handlers]
        Services[VexorionERP.Services<br/>Domain and application services]
        Database[VexorionERP.Database<br/>EF Core context and migrations]
        Models[VexorionERP.Models<br/>Entities and contracts]
    end

    UI -->|REST| Web
    AdminUI -->|REST| Web
    POS -->|REST| Web
    Web -->|Mediator commands and queries| Handler
    Web --> Services
    Handler --> Services
    Handler --> Database
    Services --> Database
    Services --> Models
    Database --> Models
    Database --> Postgres[(PostgreSQL)]
    Services --> ObjectStorage[(R2 through storage interfaces)]
```

Controllers translate HTTP requests into application calls and return the shared API result/error contract. Business rules stay in handlers and services; persistence stays behind EF Core and storage abstractions.

## 3. Authenticated API request flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Cloudflare Pages UI
    participant API as Cloud Run API
    participant Auth as Authentication and authorization
    participant App as Handler or service
    participant DB as Neon PostgreSQL
    participant Audit as Audit log

    User->>UI: Perform an action
    UI->>API: HTTPS request with bearer token
    API->>Auth: Validate JWT, tenant and permissions

    alt Token or permission is invalid
        Auth-->>API: Reject request
        API->>Audit: Record authorization boundary event
        API-->>UI: ProblemDetails with traceId
        UI-->>User: Actionable error message
    else Request is authorized
        Auth-->>API: User and tenant context
        API->>App: Dispatch command or query
        App->>DB: Tenant-scoped operation
        DB-->>App: Result
        App->>Audit: Persist business audit entry with correlation ID
        App-->>API: Service result
        API-->>UI: Success response
        UI-->>User: Updated state
    end
```

The HTTP `traceId` and persisted audit correlation ID allow an operator to connect an error response with application logs and audit history.

## 4. Tenant-isolation model

```mermaid
flowchart TD
    Token[Validated JWT claims] --> TenantProvider[Current tenant provider]
    TenantProvider --> DbContext[AppDbContext tenant context]
    TenantProvider --> Permission[Role and permission checks]

    DbContext --> Filters[EF Core tenant query filters]
    Filters --> TenantRows[(Rows with matching TenantId)]

    Command[Command or service mutation] --> ExplicitScope[Explicit tenant-scoped lookup]
    TenantProvider --> ExplicitScope
    ExplicitScope --> TenantRows

    Permission --> Allowed{Authorized?}
    Allowed -->|No| Forbidden[403 ProblemDetails and audit]
    Allowed -->|Yes| Command
```

Tenant isolation is enforced in both authorization and data access. Cross-tenant identifiers must not bypass the current tenant context, even when the identifier itself is valid.

## 5. Project-document upload and download

```mermaid
sequenceDiagram
    actor User
    participant UI as Main UI
    participant API as Project document API
    participant Security as Upload security service
    participant R2 as Private R2 document bucket
    participant DB as Neon PostgreSQL

    User->>UI: Choose project and file
    UI->>API: Multipart upload
    API->>Security: Validate name, size, type and signature
    Note over Security: Malware scanning is currently disabled

    alt Validation fails
        Security-->>API: Specific validation failure
        API-->>UI: Actionable ProblemDetails
    else Validation succeeds
        Security-->>API: Sanitized validated file
        API->>R2: Store tenant-scoped object
        R2-->>API: Object key and metadata
        API->>DB: Save document/version record
        DB-->>API: Saved record
        API-->>UI: Document metadata
    end

    User->>UI: Preview or download
    UI->>API: Request document access
    API->>DB: Verify tenant, project and permission
    API->>R2: Generate short-lived read URL
    R2-->>API: Signed URL valid for 5 minutes
    API-->>UI: Signed URL
    UI->>R2: Download object
```

Private document access is authorized before a signed URL is issued. The URL is read-only and short-lived.

## 6. Storage deletion consistency

```mermaid
flowchart TD
    Start[Delete product, document or project] --> Load[Load tenant-scoped record and object keys]
    Load --> Exists{Record exists and is authorized?}
    Exists -->|No| NotFound[Return safe not-found or forbidden result]
    Exists -->|Yes| DeleteObjects[Delete all distinct R2 objects]
    DeleteObjects --> StorageOK{Storage deletion succeeded?}
    StorageOK -->|No| Preserve[Preserve database record]
    Preserve --> Retry[Return actionable retry error]
    StorageOK -->|Yes| DeleteRows[Delete database record or cascade]
    DeleteRows --> Audit[Write correlated audit entry]
    Audit --> Complete[Return success]
```

Storage is deleted before the database record. If R2 cleanup fails, the record remains so the operation can be retried instead of silently orphaning an object.

## 7. Database migration, bootstrap, and runtime separation

```mermaid
flowchart LR
    Operator[Authorized operator]
    Migration[Explicit migrate operation]
    Bootstrap[Explicit bootstrap operation]
    Runtime[Normal API startup]

    Direct[Direct Neon endpoint<br/>migration role]
    Pooler[Pooled Neon endpoint<br/>runtime role]
    DB[(Same production database)]

    Operator -->|vexorion-operation=migrate| Migration
    Operator -->|vexorion-operation=bootstrap| Bootstrap
    Migration -->|Schema privileges| Direct
    Bootstrap -->|One-time identity provisioning| Direct
    Direct --> DB

    Runtime -->|DML only| Pooler
    Pooler --> DB

    DB --> Tenant[Tenant vexorionerp]
    DB --> Company[Company MAIN]
    DB --> Admin[Initial admin identity]
```

Normal startup cannot apply migrations or bootstrap data. The runtime role can use application tables but cannot create database or schema objects.

## 8. Backend CI/CD workflow

```mermaid
flowchart LR
    Push[Approved push to master] --> Actions[GitHub Actions backend workflow]
    Actions --> Quality[Restore, Release build and tests]
    Quality -->|Pass| OIDC[GitHub OIDC exchange]
    Quality -->|Fail| Stop[Stop deployment]

    OIDC --> Deployer[Short-lived deployer identity]
    License[GitHub Six Labors license secret] -.-> Build[Docker BuildKit build]
    Deployer --> Build
    Build --> Registry[(Artifact Registry)]
    Registry --> Digest[Resolve immutable image digest]
    Digest --> Deploy[Update Cloud Run revision]
    SecretManager[Secret Manager] -.-> Deploy
    Deploy --> Live[Check health/live]
    Live --> Ready[Check health/ready]
    Ready --> Production[Revision receives production traffic]
```

GitHub does not hold a Google service-account key or runtime database/storage secrets. Cloud Run obtains runtime secrets directly from Secret Manager.

## 9. Frontend CI/CD and affected-build workflow

```mermaid
flowchart TD
    Change[Frontend push or manual dispatch] --> Install[Node 22 and npm ci]
    Install --> Graph[Turbo affected-package graph]
    APISecret[FRONTEND_PROD_API_BASE_URL] -.-> Build[Build selected applications]
    Graph --> Build
    Build --> Typecheck[Type check affected packages]
    Typecheck --> Lint[Lint affected packages]
    Lint --> Unit[Unit tests and coverage]
    Unit --> Artifact[Upload dist artifact]

    Artifact --> UIChanged{Which application was built?}
    UIChanged -->|Main UI| MainDeploy[Deploy vexorionerp-app]
    UIChanged -->|Admin UI| AdminDeploy[Deploy vexorionerp-admin]
    UIChanged -->|POS| PosDeploy[Deploy vexorionerp-pos]

    CFToken[Cloudflare token and account ID] -.-> MainDeploy
    CFToken -.-> AdminDeploy
    CFToken -.-> PosDeploy

    MainDeploy --> MainDomain[app.vexorionerp.com]
    AdminDeploy --> AdminDomain[admin.vexorionerp.com]
    PosDeploy --> PosDomain[pos.vexorionerp.com]
```

A shared-package or lockfile change can rebuild all consumers. A manual run with `deploy_all=true` rebuilds every frontend, which is required after changing a build-time API URL.

## 10. Secrets and configuration boundaries

```mermaid
flowchart TB
    subgraph GitHub[GitHub production environment]
        DeployVars[Non-secret GCP deployment identifiers]
        CFDeploy[Cloudflare Pages deployment credentials]
        License[Six Labors build license]
    end

    subgraph Google[Google Cloud]
        WIF[Workload Identity Federation]
        SM[Secret Manager]
        Run[Cloud Run service]
        Image[Published container image]
    end

    subgraph RuntimeSecrets[Secret Manager values]
        DBSecret[Neon runtime connection]
        JWT[JWT signing key]
        R2Key[R2 access key ID and secret]
        LokiKey[Grafana Loki API key]
    end

    DeployVars --> WIF
    WIF --> Run
    License -->|Build-time secret only| Image
    Image --> Run
    CFDeploy -->|Frontend deployment only| Pages[Cloudflare Pages]

    DBSecret --> SM
    JWT --> SM
    R2Key --> SM
    LokiKey --> SM
    SM -->|Explicit secret versions| Run
```

Non-secret R2 bucket identifiers and Loki endpoint/user values are Cloud Run environment variables. Sensitive runtime values are not duplicated in GitHub.

## 11. Observability and error correlation

```mermaid
flowchart LR
    Request[HTTP request] --> Trace[Request trace ID]
    Trace --> API[Cloud Run API]
    API --> Structured[Structured application log]
    API --> Audit[(Persistent audit log with correlation ID)]
    Structured --> CloudLog[Google Cloud Logging]
    Structured --> Loki[Grafana Loki]

    Error[ProblemDetails response] --> ResponseTrace[traceId shown to client/operator]
    Trace --> ResponseTrace
    ResponseTrace -.->|Search same identifier| CloudLog
    ResponseTrace -.->|Search same identifier| Loki
    ResponseTrace -.->|Correlate authorization/business event| Audit
```

Health endpoints serve different purposes: `/health/live` confirms that the process is alive, while `/health/ready` confirms that the application is ready to receive traffic.

## Related operational guides

- [Neon PostgreSQL production setup](NEON_PRODUCTION_SETUP.md)
- [Google Cloud Run production setup](GOOGLE_CLOUD_RUN_PRODUCTION_SETUP.md)
- [Cloudflare R2 production setup](CLOUDFLARE_R2_SETUP.md)
- [Cloudflare Pages setup for the three UIs](CLOUDFLARE_PAGES_UI_SETUP.md)
- [Migration and development plan](VEXORIONERP_AZURE_MIGRATION_PLAN.md)

