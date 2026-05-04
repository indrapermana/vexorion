using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database
{
    /// <inheritdoc />
    public partial class AddImportJobsAndGeneratedDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GeneratedDocument",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceType = table.Column<int>(type: "integer", nullable: false),
                    SourceEntityId = table.Column<Guid>(type: "uuid", nullable: false),
                    Format = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    FileName = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    BlobPath = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    ChecksumSha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    GeneratedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    GeneratedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GeneratedDocument", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GeneratedDocument_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ImportJob",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ImportType = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    SourceFileName = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    SourceBlobPath = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    TotalRows = table.Column<int>(type: "integer", nullable: false),
                    ValidRows = table.Column<int>(type: "integer", nullable: false),
                    InvalidRows = table.Column<int>(type: "integer", nullable: false),
                    RequestedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ValidatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SubmittedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ErrorSummary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    IdempotencyKey = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportJob", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportJob_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GeneratedDocument_TenantId",
                table: "GeneratedDocument",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_GeneratedDocument_TenantId_SourceType_SourceEntityId",
                table: "GeneratedDocument",
                columns: new[] { "TenantId", "SourceType", "SourceEntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_GeneratedDocument_TenantId_SourceType_SourceEntityId_Format~",
                table: "GeneratedDocument",
                columns: new[] { "TenantId", "SourceType", "SourceEntityId", "Format", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GeneratedDocument_TenantId_Status_GeneratedAtUtc",
                table: "GeneratedDocument",
                columns: new[] { "TenantId", "Status", "GeneratedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportJob_TenantId",
                table: "ImportJob",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportJob_TenantId_IdempotencyKey",
                table: "ImportJob",
                columns: new[] { "TenantId", "IdempotencyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImportJob_TenantId_ImportType_CreatedAtUtc",
                table: "ImportJob",
                columns: new[] { "TenantId", "ImportType", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportJob_TenantId_Status_CreatedAtUtc",
                table: "ImportJob",
                columns: new[] { "TenantId", "Status", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GeneratedDocument");

            migrationBuilder.DropTable(
                name: "ImportJob");
        }
    }
}
