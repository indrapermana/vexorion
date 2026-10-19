using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLogCorrelationId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CorrelationId",
                table: "AuditLog",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AuditLog_TenantId_CorrelationId",
                table: "AuditLog",
                columns: new[] { "TenantId", "CorrelationId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AuditLog_TenantId_CorrelationId",
                table: "AuditLog");

            migrationBuilder.DropColumn(
                name: "CorrelationId",
                table: "AuditLog");
        }
    }
}
