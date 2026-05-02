using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database
{
    /// <inheritdoc />
    public partial class AddTenantPageVisitsTelemetry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TenantPageVisit",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Path = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    VisitCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    LastVisitedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantPageVisit", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantPageVisit_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TenantPageVisit_TenantId",
                table: "TenantPageVisit",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantPageVisit_TenantId_LastVisitedAtUtc",
                table: "TenantPageVisit",
                columns: new[] { "TenantId", "LastVisitedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_TenantPageVisit_TenantId_Path",
                table: "TenantPageVisit",
                columns: new[] { "TenantId", "Path" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TenantPageVisit");
        }
    }
}
