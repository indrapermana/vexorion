using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddWarehouseToOrderHeaders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "WarehouseId",
                table: "SalesOrder",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "WarehouseId",
                table: "PurchaseOrder",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

            migrationBuilder.Sql(@"
                INSERT INTO ""Warehouse"" (""Id"", ""TenantId"", ""Code"", ""Name"", ""LocationDescription"", ""CreatedAtUtc"", ""UpdatedAtUtc"", ""IsActive"")
                SELECT gen_random_uuid(), source.""TenantId"", 'DEFAULT', 'Default Warehouse', 'Backfilled during order warehouse migration', NOW(), NULL, TRUE
                FROM (
                    SELECT DISTINCT ""TenantId"" FROM ""SalesOrder""
                    UNION
                    SELECT DISTINCT ""TenantId"" FROM ""PurchaseOrder""
                ) AS source
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM ""Warehouse"" AS warehouse
                    WHERE warehouse.""TenantId"" = source.""TenantId""
                );");

            migrationBuilder.Sql(@"
                UPDATE ""SalesOrder"" AS salesOrder
                SET ""WarehouseId"" = (
                    SELECT ""Id""
                    FROM ""Warehouse""
                    WHERE ""TenantId"" = salesOrder.""TenantId""
                    ORDER BY ""CreatedAtUtc"", ""Id""
                    LIMIT 1
                )
                WHERE salesOrder.""WarehouseId"" IS NULL;");

            migrationBuilder.Sql(@"
                UPDATE ""PurchaseOrder"" AS purchaseOrder
                SET ""WarehouseId"" = (
                    SELECT ""Id""
                    FROM ""Warehouse""
                    WHERE ""TenantId"" = purchaseOrder.""TenantId""
                    ORDER BY ""CreatedAtUtc"", ""Id""
                    LIMIT 1
                )
                WHERE purchaseOrder.""WarehouseId"" IS NULL;");

            migrationBuilder.AlterColumn<Guid>(
                name: "WarehouseId",
                table: "SalesOrder",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "WarehouseId",
                table: "PurchaseOrder",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalesOrder_WarehouseId",
                table: "SalesOrder",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrder_WarehouseId",
                table: "PurchaseOrder",
                column: "WarehouseId");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseOrder_Warehouse_WarehouseId",
                table: "PurchaseOrder",
                column: "WarehouseId",
                principalTable: "Warehouse",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SalesOrder_Warehouse_WarehouseId",
                table: "SalesOrder",
                column: "WarehouseId",
                principalTable: "Warehouse",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseOrder_Warehouse_WarehouseId",
                table: "PurchaseOrder");

            migrationBuilder.DropForeignKey(
                name: "FK_SalesOrder_Warehouse_WarehouseId",
                table: "SalesOrder");

            migrationBuilder.DropIndex(
                name: "IX_SalesOrder_WarehouseId",
                table: "SalesOrder");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrder_WarehouseId",
                table: "PurchaseOrder");

            migrationBuilder.DropColumn(
                name: "WarehouseId",
                table: "SalesOrder");

            migrationBuilder.DropColumn(
                name: "WarehouseId",
                table: "PurchaseOrder");
        }
    }
}
