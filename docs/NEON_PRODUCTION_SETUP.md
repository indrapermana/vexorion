# Neon PostgreSQL Production Setup

This runbook creates the empty Neon PostgreSQL database used by the VexorionERP production API. It deliberately separates schema-management privileges from normal application privileges.

## Resulting design

| Purpose | Connection | Role |
|---|---|---|
| EF Core migrations and initial bootstrap | Direct, non-pooled endpoint | `vexorion_migrator_production` |
| Normal API traffic | Pooled endpoint | `vexorion_runtime_production` |

Both connections target the same database, `vexorionerp_production`. The separation limits the damage possible through the normal application connection.

## Prerequisites

- A Neon account and a production Neon project.
- `psql` installed locally.
- .NET 10 SDK installed.
- A strong JWT signing key of at least 32 characters for one-time provisioning commands.
- The repository checked out locally.

Never commit a database password or paste it into a ticket, chat, or command history. Store production connection strings in Google Secret Manager after setup.

## 1. Create the production project and database

1. In Neon, create a project for VexorionERP production.
2. Select the region closest to the Cloud Run service and permitted by the product's data-residency requirements.
3. Create the database `vexorionerp_production`.
4. Keep the Neon-managed owner role for administration only.
5. Do not copy the old staging database. Production starts empty.

Record the direct and pooled hostnames, but do not record passwords in this document.

## 2. Create the migration and runtime roles

Create these roles through the Neon console so Neon generates and manages plaintext-compatible passwords:

- `vexorion_migrator_production`
- `vexorion_runtime_production`

Save each generated password immediately in a password manager. If Neon creates a role with inherited `neon_superuser` membership, remove that membership through an owner/admin connection before continuing.

Verify membership:

```sql
SELECT
    pg_has_role(
        'vexorion_migrator_production',
        'neon_superuser',
        'member'
    ) AS migrator_is_neon_superuser,
    pg_has_role(
        'vexorion_runtime_production',
        'neon_superuser',
        'member'
    ) AS runtime_is_neon_superuser;
```

The required result is `false | false`.

## 3. Grant database and schema privileges

Connect as the Neon database owner and run:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

GRANT CONNECT ON DATABASE vexorionerp_production
TO vexorion_migrator_production, vexorion_runtime_production;

GRANT USAGE ON SCHEMA public
TO vexorion_migrator_production, vexorion_runtime_production;

GRANT CREATE ON SCHEMA public TO vexorion_migrator_production;
REVOKE CREATE ON SCHEMA public FROM vexorion_runtime_production;
REVOKE CREATE ON DATABASE vexorionerp_production FROM vexorion_runtime_production;
```

If the schema is owned by `pg_database_owner`, this is expected. The migration role needs explicit `CREATE` privilege; it does not need to own the database.

## 4. Build the two connection strings

Use the Neon **direct** endpoint for migrations:

```text
Host=<direct-host>;Database=vexorionerp_production;Username=vexorion_migrator_production;Password=<password>;SSL Mode=VerifyFull
```

Use the Neon **pooled** endpoint for the API runtime:

```text
Host=<pooled-host>;Database=vexorionerp_production;Username=vexorion_runtime_production;Password=<password>;SSL Mode=VerifyFull;GSS Encryption Mode=Disable
```

Do not replace `VerifyFull` with `Require`; `VerifyFull` provides stricter hostname and certificate verification.

## 5. Apply EF Core migrations

Supply secrets only for the current shell or through a secure local environment file. The explicit operation prevents ordinary API startup from changing the schema.

```bash
ASPNETCORE_ENVIRONMENT=Production \
ConnectionStrings__MigrationConnection='<direct-migration-connection>' \
Jwt__SecretKey='<temporary-valid-jwt-secret>' \
dotnet run \
  --project VexorionERP/VexorionERP.csproj \
  --no-launch-profile \
  -- \
  --vexorion-operation=migrate
```

The output should report that migrations were applied, or that the database is already current on a repeated run.

## 6. Grant runtime access to migrated objects

After migrations exist, connect as the owner and run:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO vexorion_runtime_production;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO vexorion_runtime_production;

ALTER DEFAULT PRIVILEGES
FOR ROLE vexorion_migrator_production
IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
TO vexorion_runtime_production;

ALTER DEFAULT PRIVILEGES
FOR ROLE vexorion_migrator_production
IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES
TO vexorion_runtime_production;
```

The default privileges ensure future objects created by the migration role are usable by the runtime role.

## 7. Bootstrap the initial tenant

Run bootstrap once with invocation-scoped values. Production provisioning operations use `MigrationConnection`, including bootstrap. The tenant, company, and administrator identity fields already come from production `appsettings.json`; only the temporary password is supplied here. Use a strong password and rotate it immediately after login.

```bash
ASPNETCORE_ENVIRONMENT=Production \
ConnectionStrings__MigrationConnection='<direct-migration-connection>' \
Jwt__SecretKey='<temporary-valid-jwt-secret>' \
Bootstrap__AdminPassword='<temporary-bootstrap-password>' \
dotnet run \
  --project VexorionERP/VexorionERP.csproj \
  --no-launch-profile \
  -- \
  --vexorion-operation=bootstrap
```

Remove all bootstrap variables afterward. Rotate the temporary administrator password through the authenticated application endpoint before production use.

## 8. Verify least privilege and bootstrap data

Connect using the runtime role and verify it can read application data but cannot create schema objects:

```sql
SELECT current_user, current_database();

SELECT
    has_database_privilege(current_user, current_database(), 'CREATE')
        AS can_create_database_objects,
    has_schema_privilege(current_user, 'public', 'CREATE')
        AS can_create_schema_objects;
```

Both privilege results must be `false`.

Verify the initial records using the actual VexorionERP table names:

```sql
SELECT
    (SELECT COUNT(*) FROM "Tenant" WHERE "Code" = 'vexorionerp') AS tenant_count,
    (
        SELECT COUNT(*)
        FROM "Company" AS company
        JOIN "Tenant" AS tenant ON tenant."Id" = company."TenantId"
        WHERE tenant."Code" = 'vexorionerp'
          AND company."Code" = 'MAIN'
    ) AS company_count,
    (
        SELECT COUNT(*)
        FROM "User" AS app_user
        JOIN "Tenant" AS tenant ON tenant."Id" = app_user."TenantId"
        WHERE tenant."Code" = 'vexorionerp'
          AND app_user."UserName" = 'admin'
    ) AS admin_count;
```

The expected result is `1 | 1 | 1`.

## 9. Store the runtime connection securely

Store only the pooled runtime connection in Google Secret Manager as `vexorionerp-production-db-connection`. Map it to `ConnectionStrings__DefaultConnection` in Cloud Run. Keep the direct migration connection outside the normal Cloud Run service and use it only for controlled migration operations.

## Operational checklist

- [ ] Production database starts empty.
- [ ] Migration and runtime roles have separate passwords.
- [ ] Neither role inherits `neon_superuser`.
- [ ] Migrations run through the direct connection.
- [ ] Runtime uses the pooled connection and cannot create database or schema objects.
- [ ] Tenant, company, and admin records exist.
- [ ] Bootstrap password is rotated and bootstrap variables are removed.
- [ ] Runtime connection is stored in Secret Manager, not GitHub.

