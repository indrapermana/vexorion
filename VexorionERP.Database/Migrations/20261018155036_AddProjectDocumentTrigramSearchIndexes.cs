using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectDocumentTrigramSearchIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS pg_trgm;");

            CreateTrigramIndex(migrationBuilder, "ProjectDocument", "Title");
            CreateTrigramIndex(migrationBuilder, "ProjectDocument", "FileName");
            CreateTrigramIndex(migrationBuilder, "ProjectDocument", "DocumentNumber");
            CreateTrigramIndex(migrationBuilder, "ProjectDocument", "Tags");
            CreateTrigramIndex(migrationBuilder, "Project", "Name");
            CreateTrigramIndex(migrationBuilder, "Project", "ProjectNumber");
            CreateTrigramIndex(migrationBuilder, "ProjectCategory", "Code");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            DropTrigramIndex(migrationBuilder, "ProjectDocument", "Title");
            DropTrigramIndex(migrationBuilder, "ProjectDocument", "FileName");
            DropTrigramIndex(migrationBuilder, "ProjectDocument", "DocumentNumber");
            DropTrigramIndex(migrationBuilder, "ProjectDocument", "Tags");
            DropTrigramIndex(migrationBuilder, "Project", "Name");
            DropTrigramIndex(migrationBuilder, "Project", "ProjectNumber");
            DropTrigramIndex(migrationBuilder, "ProjectCategory", "Code");

            // pg_trgm may be shared by other application indexes, so do not remove it.
        }

        private static void CreateTrigramIndex(MigrationBuilder migrationBuilder, string table, string column)
        {
            migrationBuilder.Sql(
                $"CREATE INDEX CONCURRENTLY IF NOT EXISTS \"IX_{table}_{column}_Trgm\" " +
                $"ON \"{table}\" USING gin (\"{column}\" gin_trgm_ops);",
                suppressTransaction: true);
        }

        private static void DropTrigramIndex(MigrationBuilder migrationBuilder, string table, string column)
        {
            migrationBuilder.Sql(
                $"DROP INDEX CONCURRENTLY IF EXISTS \"IX_{table}_{column}_Trgm\";",
                suppressTransaction: true);
        }
    }
}
