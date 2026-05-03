using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database
{
    /// <inheritdoc />
    public partial class AddCreditNoteAndShiftSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreditNoteOfInvoiceId",
                table: "SalesInvoice",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ShiftSession",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CashierId = table.Column<Guid>(type: "uuid", nullable: false),
                    CashierName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    OpenedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClosedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    OpeningFloat = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CountedCash = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    CurrencyCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftSession", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftSession_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SalesInvoice_CreditNoteOfInvoiceId",
                table: "SalesInvoice",
                column: "CreditNoteOfInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSession_TenantId",
                table: "ShiftSession",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSession_TenantId_CashierId_Status",
                table: "ShiftSession",
                columns: new[] { "TenantId", "CashierId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ShiftSession_TenantId_OpenedAtUtc",
                table: "ShiftSession",
                columns: new[] { "TenantId", "OpenedAtUtc" });

            migrationBuilder.AddForeignKey(
                name: "FK_SalesInvoice_SalesInvoice_CreditNoteOfInvoiceId",
                table: "SalesInvoice",
                column: "CreditNoteOfInvoiceId",
                principalTable: "SalesInvoice",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SalesInvoice_SalesInvoice_CreditNoteOfInvoiceId",
                table: "SalesInvoice");

            migrationBuilder.DropTable(
                name: "ShiftSession");

            migrationBuilder.DropIndex(
                name: "IX_SalesInvoice_CreditNoteOfInvoiceId",
                table: "SalesInvoice");

            migrationBuilder.DropColumn(
                name: "CreditNoteOfInvoiceId",
                table: "SalesInvoice");
        }
    }
}
