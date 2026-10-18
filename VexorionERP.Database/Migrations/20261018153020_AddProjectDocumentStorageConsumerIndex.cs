using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectDocumentStorageConsumerIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_ProjectDocument_TenantId_FileSizeBytes",
                table: "ProjectDocument",
                columns: new[] { "TenantId", "FileSizeBytes" },
                descending: new[] { false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProjectDocument_TenantId_FileSizeBytes",
                table: "ProjectDocument");
        }
    }
}
