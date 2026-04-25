using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddCommercialDocumentLayer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PaymentTerm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    DaysDue = table.Column<int>(type: "integer", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentTerm", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentTerm_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TaxCode",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    RatePercent = table.Column<decimal>(type: "numeric(9,4)", precision: 9, scale: 4, nullable: false),
                    IsInclusive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaxCode", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaxCode_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseInvoice",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SupplierId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourcePurchaseOrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    SourcePurchaseReceiptId = table.Column<Guid>(type: "uuid", nullable: true),
                    VendorReferenceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    InvoiceDate = table.Column<DateOnly>(type: "date", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CurrencyCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    PaymentTermId = table.Column<Guid>(type: "uuid", nullable: true),
                    Subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TaxTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    GrandTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PaidTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PostedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReversedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseInvoice", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseInvoice_PaymentTerm_PaymentTermId",
                        column: x => x.PaymentTermId,
                        principalTable: "PaymentTerm",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PurchaseInvoice_PurchaseOrder_SourcePurchaseOrderId",
                        column: x => x.SourcePurchaseOrderId,
                        principalTable: "PurchaseOrder",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseInvoice_Supplier_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Supplier",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseInvoice_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SalesInvoice",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceSalesOrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    SourceSalesShipmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    InvoiceDate = table.Column<DateOnly>(type: "date", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CurrencyCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    PaymentTermId = table.Column<Guid>(type: "uuid", nullable: true),
                    Subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TaxTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    GrandTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PaidTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PostedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReversedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesInvoice", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalesInvoice_Customer_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SalesInvoice_PaymentTerm_PaymentTermId",
                        column: x => x.PaymentTermId,
                        principalTable: "PaymentTerm",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SalesInvoice_SalesOrder_SourceSalesOrderId",
                        column: x => x.SourceSalesOrderId,
                        principalTable: "SalesOrder",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SalesInvoice_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseInvoiceLine",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    TaxCodeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    UnitCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseInvoiceLine", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseInvoiceLine_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseInvoiceLine_PurchaseInvoice_PurchaseInvoiceId",
                        column: x => x.PurchaseInvoiceId,
                        principalTable: "PurchaseInvoice",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PurchaseInvoiceLine_TaxCode_TaxCodeId",
                        column: x => x.TaxCodeId,
                        principalTable: "TaxCode",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PurchaseInvoiceLine_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SalesInvoiceLine",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    TaxCodeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesInvoiceLine", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalesInvoiceLine_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SalesInvoiceLine_SalesInvoice_SalesInvoiceId",
                        column: x => x.SalesInvoiceId,
                        principalTable: "SalesInvoice",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SalesInvoiceLine_TaxCode_TaxCodeId",
                        column: x => x.TaxCodeId,
                        principalTable: "TaxCode",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SalesInvoiceLine_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTerm_TenantId",
                table: "PaymentTerm",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTerm_TenantId_Code",
                table: "PaymentTerm",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoice_PaymentTermId",
                table: "PurchaseInvoice",
                column: "PaymentTermId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoice_SourcePurchaseOrderId",
                table: "PurchaseInvoice",
                column: "SourcePurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoice_SupplierId",
                table: "PurchaseInvoice",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoice_TenantId",
                table: "PurchaseInvoice",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoice_TenantId_InvoiceNumber",
                table: "PurchaseInvoice",
                columns: new[] { "TenantId", "InvoiceNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoice_TenantId_SupplierId_InvoiceDate",
                table: "PurchaseInvoice",
                columns: new[] { "TenantId", "SupplierId", "InvoiceDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoiceLine_ProductId",
                table: "PurchaseInvoiceLine",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoiceLine_PurchaseInvoiceId_ProductId",
                table: "PurchaseInvoiceLine",
                columns: new[] { "PurchaseInvoiceId", "ProductId" });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoiceLine_TaxCodeId",
                table: "PurchaseInvoiceLine",
                column: "TaxCodeId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseInvoiceLine_TenantId",
                table: "PurchaseInvoiceLine",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesInvoice_CustomerId",
                table: "SalesInvoice",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesInvoice_PaymentTermId",
                table: "SalesInvoice",
                column: "PaymentTermId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesInvoice_SourceSalesOrderId",
                table: "SalesInvoice",
                column: "SourceSalesOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesInvoice_TenantId",
                table: "SalesInvoice",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesInvoice_TenantId_CustomerId_InvoiceDate",
                table: "SalesInvoice",
                columns: new[] { "TenantId", "CustomerId", "InvoiceDate" });

            migrationBuilder.CreateIndex(
                name: "IX_SalesInvoice_TenantId_InvoiceNumber",
                table: "SalesInvoice",
                columns: new[] { "TenantId", "InvoiceNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalesInvoiceLine_ProductId",
                table: "SalesInvoiceLine",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesInvoiceLine_SalesInvoiceId_ProductId",
                table: "SalesInvoiceLine",
                columns: new[] { "SalesInvoiceId", "ProductId" });

            migrationBuilder.CreateIndex(
                name: "IX_SalesInvoiceLine_TaxCodeId",
                table: "SalesInvoiceLine",
                column: "TaxCodeId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesInvoiceLine_TenantId",
                table: "SalesInvoiceLine",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TaxCode_TenantId",
                table: "TaxCode",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TaxCode_TenantId_Code",
                table: "TaxCode",
                columns: new[] { "TenantId", "Code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PurchaseInvoiceLine");

            migrationBuilder.DropTable(
                name: "SalesInvoiceLine");

            migrationBuilder.DropTable(
                name: "PurchaseInvoice");

            migrationBuilder.DropTable(
                name: "SalesInvoice");

            migrationBuilder.DropTable(
                name: "TaxCode");

            migrationBuilder.DropTable(
                name: "PaymentTerm");
        }
    }
}
