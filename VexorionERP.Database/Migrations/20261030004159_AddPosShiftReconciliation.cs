using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddPosShiftReconciliation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CardSales",
                table: "ShiftSession",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CashIn",
                table: "ShiftSession",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CashOut",
                table: "ShiftSession",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CashRefunds",
                table: "ShiftSession",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CashSales",
                table: "ShiftSession",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CashVariance",
                table: "ShiftSession",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ExpectedCash",
                table: "ShiftSession",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TransferSales",
                table: "ShiftSession",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "VarianceReason",
                table: "ShiftSession",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PosCashMovement",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    CashierId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PosCashMovement", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PosCashMovement_ShiftSession_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "ShiftSession",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PosCashMovement_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PosCashMovement_ShiftId",
                table: "PosCashMovement",
                column: "ShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_PosCashMovement_TenantId",
                table: "PosCashMovement",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PosCashMovement_TenantId_ShiftId_OccurredAtUtc",
                table: "PosCashMovement",
                columns: new[] { "TenantId", "ShiftId", "OccurredAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PosCashMovement");

            migrationBuilder.DropColumn(
                name: "CardSales",
                table: "ShiftSession");

            migrationBuilder.DropColumn(
                name: "CashIn",
                table: "ShiftSession");

            migrationBuilder.DropColumn(
                name: "CashOut",
                table: "ShiftSession");

            migrationBuilder.DropColumn(
                name: "CashRefunds",
                table: "ShiftSession");

            migrationBuilder.DropColumn(
                name: "CashSales",
                table: "ShiftSession");

            migrationBuilder.DropColumn(
                name: "CashVariance",
                table: "ShiftSession");

            migrationBuilder.DropColumn(
                name: "ExpectedCash",
                table: "ShiftSession");

            migrationBuilder.DropColumn(
                name: "TransferSales",
                table: "ShiftSession");

            migrationBuilder.DropColumn(
                name: "VarianceReason",
                table: "ShiftSession");
        }
    }
}
