using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceApprovals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DocumentApproval",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentType = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    DocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RequestedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RequestedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DecidedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DecidedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Comment = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentApproval", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentApproval_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentApproval_TenantId",
                table: "DocumentApproval",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentApproval_TenantId_DocumentType_DocumentId_Requested~",
                table: "DocumentApproval",
                columns: new[] { "TenantId", "DocumentType", "DocumentId", "RequestedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentApproval_TenantId_DocumentType_DocumentId_Status",
                table: "DocumentApproval",
                columns: new[] { "TenantId", "DocumentType", "DocumentId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DocumentApproval");
        }
    }
}
