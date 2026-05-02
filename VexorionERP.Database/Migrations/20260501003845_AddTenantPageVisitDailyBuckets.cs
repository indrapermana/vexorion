using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database
{
    /// <inheritdoc />
    public partial class AddTenantPageVisitDailyBuckets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TenantPageVisit_TenantId_Path",
                table: "TenantPageVisit");

            migrationBuilder.AddColumn<DateOnly>(
                name: "VisitDate",
                table: "TenantPageVisit",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            migrationBuilder.CreateIndex(
                name: "IX_TenantPageVisit_TenantId_Path_VisitDate",
                table: "TenantPageVisit",
                columns: new[] { "TenantId", "Path", "VisitDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantPageVisit_TenantId_VisitDate",
                table: "TenantPageVisit",
                columns: new[] { "TenantId", "VisitDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TenantPageVisit_TenantId_Path_VisitDate",
                table: "TenantPageVisit");

            migrationBuilder.DropIndex(
                name: "IX_TenantPageVisit_TenantId_VisitDate",
                table: "TenantPageVisit");

            migrationBuilder.DropColumn(
                name: "VisitDate",
                table: "TenantPageVisit");

            migrationBuilder.CreateIndex(
                name: "IX_TenantPageVisit_TenantId_Path",
                table: "TenantPageVisit",
                columns: new[] { "TenantId", "Path" },
                unique: true);
        }
    }
}
