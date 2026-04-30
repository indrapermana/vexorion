using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database
{
    /// <inheritdoc />
    public partial class AddCompanyCurrencyAndProductClassification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CurrencyCode",
                table: "Company",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "USD");

            migrationBuilder.CreateTable(
                name: "ProductCategory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductCategory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductCategory_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductIdentifier",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    CodeType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CodeValue = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NormalizedCodeValue = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductIdentifier", x => x.Id);
                    table.CheckConstraint("CK_ProductIdentifier_CodeType", "\"CodeType\" IN ('Barcode','QrCode')");
                    table.ForeignKey(
                        name: "FK_ProductIdentifier_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductIdentifier_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductCategoryAssignment",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductCategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductCategoryAssignment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductCategoryAssignment_ProductCategory_ProductCategoryId",
                        column: x => x.ProductCategoryId,
                        principalTable: "ProductCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductCategoryAssignment_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductCategoryAssignment_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Company_CurrencyCode",
                table: "Company",
                sql: "\"CurrencyCode\" IN ('USD','SGD','MYR','IDR','AUD')");

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategory_TenantId",
                table: "ProductCategory",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategory_TenantId_NormalizedName",
                table: "ProductCategory",
                columns: new[] { "TenantId", "NormalizedName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategoryAssignment_ProductCategoryId",
                table: "ProductCategoryAssignment",
                column: "ProductCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategoryAssignment_ProductId",
                table: "ProductCategoryAssignment",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategoryAssignment_TenantId",
                table: "ProductCategoryAssignment",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategoryAssignment_TenantId_ProductCategoryId",
                table: "ProductCategoryAssignment",
                columns: new[] { "TenantId", "ProductCategoryId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategoryAssignment_TenantId_ProductId",
                table: "ProductCategoryAssignment",
                columns: new[] { "TenantId", "ProductId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategoryAssignment_TenantId_ProductId_ProductCategor~",
                table: "ProductCategoryAssignment",
                columns: new[] { "TenantId", "ProductId", "ProductCategoryId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductIdentifier_ProductId",
                table: "ProductIdentifier",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductIdentifier_TenantId",
                table: "ProductIdentifier",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductIdentifier_TenantId_NormalizedCodeValue",
                table: "ProductIdentifier",
                columns: new[] { "TenantId", "NormalizedCodeValue" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductIdentifier_TenantId_ProductId",
                table: "ProductIdentifier",
                columns: new[] { "TenantId", "ProductId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProductIdentifier_TenantId_ProductId_CodeType_IsPrimary",
                table: "ProductIdentifier",
                columns: new[] { "TenantId", "ProductId", "CodeType", "IsPrimary" },
                filter: "\"IsPrimary\" = TRUE");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductCategoryAssignment");

            migrationBuilder.DropTable(
                name: "ProductIdentifier");

            migrationBuilder.DropTable(
                name: "ProductCategory");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Company_CurrencyCode",
                table: "Company");

            migrationBuilder.DropColumn(
                name: "CurrencyCode",
                table: "Company");
        }
    }
}
