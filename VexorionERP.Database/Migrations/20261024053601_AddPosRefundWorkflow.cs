using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddPosRefundWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AppliedCreditTotal",
                table: "SalesInvoice",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "PosRefundRecordId",
                table: "InventoryMovement",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PosRefundRecord",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IdempotencyKey = table.Column<Guid>(type: "uuid", nullable: false),
                    CashierId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    SalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreditNoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    RefundPaymentId = table.Column<Guid>(type: "uuid", nullable: true),
                    RequestHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    TotalCreditAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    RefundAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    AppliedCreditAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PaymentMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ResponseJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PosRefundRecord", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PosRefundRecord_CustomerPayment_RefundPaymentId",
                        column: x => x.RefundPaymentId,
                        principalTable: "CustomerPayment",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PosRefundRecord_SalesInvoice_CreditNoteId",
                        column: x => x.CreditNoteId,
                        principalTable: "SalesInvoice",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PosRefundRecord_SalesInvoice_SalesInvoiceId",
                        column: x => x.SalesInvoiceId,
                        principalTable: "SalesInvoice",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PosRefundRecord_ShiftSession_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "ShiftSession",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PosRefundRecord_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PosRefundLine",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PosRefundRecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    SalesInvoiceLineId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ReturnToStock = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PosRefundLine", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PosRefundLine_PosRefundRecord_PosRefundRecordId",
                        column: x => x.PosRefundRecordId,
                        principalTable: "PosRefundRecord",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PosRefundLine_SalesInvoiceLine_SalesInvoiceLineId",
                        column: x => x.SalesInvoiceLineId,
                        principalTable: "SalesInvoiceLine",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PosRefundLine_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryMovement_PosRefundRecordId",
                table: "InventoryMovement",
                column: "PosRefundRecordId");

            migrationBuilder.CreateIndex(
                name: "IX_PosRefundLine_PosRefundRecordId",
                table: "PosRefundLine",
                column: "PosRefundRecordId");

            migrationBuilder.CreateIndex(
                name: "IX_PosRefundLine_SalesInvoiceLineId",
                table: "PosRefundLine",
                column: "SalesInvoiceLineId");

            migrationBuilder.CreateIndex(
                name: "IX_PosRefundLine_TenantId",
                table: "PosRefundLine",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PosRefundLine_TenantId_PosRefundRecordId_SalesInvoiceLineId",
                table: "PosRefundLine",
                columns: new[] { "TenantId", "PosRefundRecordId", "SalesInvoiceLineId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PosRefundLine_TenantId_SalesInvoiceLineId",
                table: "PosRefundLine",
                columns: new[] { "TenantId", "SalesInvoiceLineId" });

            migrationBuilder.CreateIndex(
                name: "IX_PosRefundRecord_CreditNoteId",
                table: "PosRefundRecord",
                column: "CreditNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_PosRefundRecord_RefundPaymentId",
                table: "PosRefundRecord",
                column: "RefundPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_PosRefundRecord_SalesInvoiceId",
                table: "PosRefundRecord",
                column: "SalesInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_PosRefundRecord_ShiftId",
                table: "PosRefundRecord",
                column: "ShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_PosRefundRecord_TenantId",
                table: "PosRefundRecord",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PosRefundRecord_TenantId_IdempotencyKey",
                table: "PosRefundRecord",
                columns: new[] { "TenantId", "IdempotencyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PosRefundRecord_TenantId_SalesInvoiceId",
                table: "PosRefundRecord",
                columns: new[] { "TenantId", "SalesInvoiceId" });

            migrationBuilder.CreateIndex(
                name: "IX_PosRefundRecord_TenantId_ShiftId",
                table: "PosRefundRecord",
                columns: new[] { "TenantId", "ShiftId" });

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryMovement_PosRefundRecord_PosRefundRecordId",
                table: "InventoryMovement",
                column: "PosRefundRecordId",
                principalTable: "PosRefundRecord",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryMovement_PosRefundRecord_PosRefundRecordId",
                table: "InventoryMovement");

            migrationBuilder.DropTable(
                name: "PosRefundLine");

            migrationBuilder.DropTable(
                name: "PosRefundRecord");

            migrationBuilder.DropIndex(
                name: "IX_InventoryMovement_PosRefundRecordId",
                table: "InventoryMovement");

            migrationBuilder.DropColumn(
                name: "AppliedCreditTotal",
                table: "SalesInvoice");

            migrationBuilder.DropColumn(
                name: "PosRefundRecordId",
                table: "InventoryMovement");
        }
    }
}
