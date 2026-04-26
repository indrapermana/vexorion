using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddNumberingSequences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NumberingSequence",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentType = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    PrefixTemplate = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    NextNumber = table.Column<int>(type: "integer", nullable: false),
                    NumberPadding = table.Column<int>(type: "integer", nullable: false),
                    ResetPeriod = table.Column<int>(type: "integer", nullable: false),
                    CurrentPeriodKey = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NumberingSequence", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NumberingSequence_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NumberingSequence_TenantId",
                table: "NumberingSequence",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_NumberingSequence_TenantId_DocumentType",
                table: "NumberingSequence",
                columns: new[] { "TenantId", "DocumentType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NumberingSequence");
        }
    }
}
