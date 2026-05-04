using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database
{
    /// <inheritdoc />
    public partial class AddImportJobValidatedRowsJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ValidatedRowsJson",
                table: "ImportJob",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ValidatedRowsJson",
                table: "ImportJob");
        }
    }
}
