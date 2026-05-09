using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VexorionERP.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectAndDocumentManagementFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Consultant",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ConsultantNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    OrganizationName = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    Specialty = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Consultant", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Consultant_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProjectCategory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectCategory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectCategory_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StorageUsageSummary",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UsedBytes = table.Column<long>(type: "bigint", nullable: false),
                    ReservedBytes = table.Column<long>(type: "bigint", nullable: false),
                    LastCalculatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StorageUsageSummary", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StorageUsageSummary_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TenantModuleConfig",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectManagementEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    DocumentManagementEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    EmployeeManagementEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    SalesEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    PurchasingEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    InventoryEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    UpdatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantModuleConfig", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantModuleConfig_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TenantModuleConfig_User_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TenantPlan",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PlanName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    MaxStorageBytes = table.Column<long>(type: "bigint", nullable: false),
                    MaxFileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    WarningThresholdPercent = table.Column<int>(type: "integer", nullable: false),
                    SoftBlockThresholdPercent = table.Column<int>(type: "integer", nullable: false),
                    HardBlockThresholdPercent = table.Column<int>(type: "integer", nullable: false),
                    EffectiveFromUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EffectiveToUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantPlan", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantPlan_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TenantRelationship",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RelatedTenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    RelationshipType = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: true),
                    EffectiveTo = table.Column<DateOnly>(type: "date", nullable: true),
                    ContractReference = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    ScopeJson = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantRelationship", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantRelationship_Tenant_RelatedTenantId",
                        column: x => x.RelatedTenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TenantRelationship_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Project",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectCategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    GovernmentAgency = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    SubmissionReference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Project", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Project_ProjectCategory_ProjectCategoryId",
                        column: x => x.ProjectCategoryId,
                        principalTable: "ProjectCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Project_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DocumentFolder",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentFolderId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentFolder", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentFolder_DocumentFolder_ParentFolderId",
                        column: x => x.ParentFolderId,
                        principalTable: "DocumentFolder",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DocumentFolder_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Project",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DocumentFolder_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProjectAssignment",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
                    ConsultantId = table.Column<Guid>(type: "uuid", nullable: true),
                    RoleTitle = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    IsPrimaryAssignment = table.Column<bool>(type: "boolean", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectAssignment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectAssignment_Consultant_ConsultantId",
                        column: x => x.ConsultantId,
                        principalTable: "Consultant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProjectAssignment_Employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employee",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProjectAssignment_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Project",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectAssignment_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProjectParty",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    RelatedTenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    RelationshipType = table.Column<int>(type: "integer", nullable: false),
                    CanViewDocuments = table.Column<bool>(type: "boolean", nullable: false),
                    CanUploadDocuments = table.Column<bool>(type: "boolean", nullable: false),
                    CanAssignPeople = table.Column<bool>(type: "boolean", nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: true),
                    EffectiveTo = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectParty", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectParty_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Project",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectParty_Tenant_RelatedTenantId",
                        column: x => x.RelatedTenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProjectParty_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProjectDocument",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentFolderId = table.Column<Guid>(type: "uuid", nullable: true),
                    DocumentNumber = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FileName = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    StoragePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    CurrentVersionNumber = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Tags = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectDocument", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectDocument_DocumentFolder_DocumentFolderId",
                        column: x => x.DocumentFolderId,
                        principalTable: "DocumentFolder",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ProjectDocument_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Project",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectDocument_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DocumentAccessPolicy",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectDocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubjectTenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CanView = table.Column<bool>(type: "boolean", nullable: false),
                    CanDownload = table.Column<bool>(type: "boolean", nullable: false),
                    CanUploadVersion = table.Column<bool>(type: "boolean", nullable: false),
                    ValidFromUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ValidToUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentAccessPolicy", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentAccessPolicy_ProjectDocument_ProjectDocumentId",
                        column: x => x.ProjectDocumentId,
                        principalTable: "ProjectDocument",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DocumentAccessPolicy_Tenant_SubjectTenantId",
                        column: x => x.SubjectTenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DocumentAccessPolicy_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DocumentVersion",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectDocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    VersionNumber = table.Column<int>(type: "integer", nullable: false),
                    FileName = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    StoragePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Checksum = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    UploadedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    UploadedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentVersion", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentVersion_ProjectDocument_ProjectDocumentId",
                        column: x => x.ProjectDocumentId,
                        principalTable: "ProjectDocument",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DocumentVersion_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DocumentVersion_User_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "StorageUsageLedger",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProjectDocumentId = table.Column<Guid>(type: "uuid", nullable: true),
                    OperationType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DeltaBytes = table.Column<long>(type: "bigint", nullable: false),
                    ResultingUsedBytes = table.Column<long>(type: "bigint", nullable: false),
                    PerformedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Reference = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StorageUsageLedger", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StorageUsageLedger_ProjectDocument_ProjectDocumentId",
                        column: x => x.ProjectDocumentId,
                        principalTable: "ProjectDocument",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StorageUsageLedger_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Project",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StorageUsageLedger_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StorageUsageLedger_User_PerformedByUserId",
                        column: x => x.PerformedByUserId,
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Consultant_TenantId",
                table: "Consultant",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Consultant_TenantId_ConsultantNumber",
                table: "Consultant",
                columns: new[] { "TenantId", "ConsultantNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Consultant_TenantId_Email",
                table: "Consultant",
                columns: new[] { "TenantId", "Email" });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentAccessPolicy_ProjectDocumentId",
                table: "DocumentAccessPolicy",
                column: "ProjectDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentAccessPolicy_SubjectTenantId",
                table: "DocumentAccessPolicy",
                column: "SubjectTenantId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentAccessPolicy_TenantId",
                table: "DocumentAccessPolicy",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentAccessPolicy_TenantId_ProjectDocumentId_SubjectTena~",
                table: "DocumentAccessPolicy",
                columns: new[] { "TenantId", "ProjectDocumentId", "SubjectTenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentFolder_ParentFolderId",
                table: "DocumentFolder",
                column: "ParentFolderId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentFolder_ProjectId",
                table: "DocumentFolder",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentFolder_TenantId",
                table: "DocumentFolder",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentFolder_TenantId_ProjectId_ParentFolderId_Name",
                table: "DocumentFolder",
                columns: new[] { "TenantId", "ProjectId", "ParentFolderId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentVersion_ProjectDocumentId",
                table: "DocumentVersion",
                column: "ProjectDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentVersion_TenantId",
                table: "DocumentVersion",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentVersion_TenantId_ProjectDocumentId_VersionNumber",
                table: "DocumentVersion",
                columns: new[] { "TenantId", "ProjectDocumentId", "VersionNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentVersion_UploadedByUserId",
                table: "DocumentVersion",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Project_ProjectCategoryId",
                table: "Project",
                column: "ProjectCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Project_TenantId",
                table: "Project",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Project_TenantId_ProjectNumber",
                table: "Project",
                columns: new[] { "TenantId", "ProjectNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Project_TenantId_Status",
                table: "Project",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAssignment_ConsultantId",
                table: "ProjectAssignment",
                column: "ConsultantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAssignment_EmployeeId",
                table: "ProjectAssignment",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAssignment_ProjectId",
                table: "ProjectAssignment",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAssignment_TenantId",
                table: "ProjectAssignment",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAssignment_TenantId_ProjectId_StartDate",
                table: "ProjectAssignment",
                columns: new[] { "TenantId", "ProjectId", "StartDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectCategory_TenantId",
                table: "ProjectCategory",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectCategory_TenantId_Code",
                table: "ProjectCategory",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectCategory_TenantId_Name",
                table: "ProjectCategory",
                columns: new[] { "TenantId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectDocument_DocumentFolderId",
                table: "ProjectDocument",
                column: "DocumentFolderId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectDocument_ProjectId",
                table: "ProjectDocument",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectDocument_TenantId",
                table: "ProjectDocument",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectDocument_TenantId_DocumentNumber",
                table: "ProjectDocument",
                columns: new[] { "TenantId", "DocumentNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectDocument_TenantId_ProjectId_Status",
                table: "ProjectDocument",
                columns: new[] { "TenantId", "ProjectId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectParty_ProjectId",
                table: "ProjectParty",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectParty_RelatedTenantId",
                table: "ProjectParty",
                column: "RelatedTenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectParty_TenantId",
                table: "ProjectParty",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectParty_TenantId_ProjectId_RelatedTenantId_Relationshi~",
                table: "ProjectParty",
                columns: new[] { "TenantId", "ProjectId", "RelatedTenantId", "RelationshipType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StorageUsageLedger_PerformedByUserId",
                table: "StorageUsageLedger",
                column: "PerformedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_StorageUsageLedger_ProjectDocumentId",
                table: "StorageUsageLedger",
                column: "ProjectDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_StorageUsageLedger_ProjectId",
                table: "StorageUsageLedger",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_StorageUsageLedger_TenantId",
                table: "StorageUsageLedger",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_StorageUsageLedger_TenantId_OccurredAtUtc",
                table: "StorageUsageLedger",
                columns: new[] { "TenantId", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_StorageUsageSummary_TenantId",
                table: "StorageUsageSummary",
                column: "TenantId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantModuleConfig_TenantId",
                table: "TenantModuleConfig",
                column: "TenantId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantModuleConfig_UpdatedByUserId",
                table: "TenantModuleConfig",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantPlan_TenantId",
                table: "TenantPlan",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantPlan_TenantId_IsDefault",
                table: "TenantPlan",
                columns: new[] { "TenantId", "IsDefault" });

            migrationBuilder.CreateIndex(
                name: "IX_TenantPlan_TenantId_PlanCode_EffectiveFromUtc",
                table: "TenantPlan",
                columns: new[] { "TenantId", "PlanCode", "EffectiveFromUtc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantRelationship_RelatedTenantId",
                table: "TenantRelationship",
                column: "RelatedTenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantRelationship_TenantId",
                table: "TenantRelationship",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantRelationship_TenantId_RelatedTenantId_RelationshipType",
                table: "TenantRelationship",
                columns: new[] { "TenantId", "RelatedTenantId", "RelationshipType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantRelationship_TenantId_Status",
                table: "TenantRelationship",
                columns: new[] { "TenantId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DocumentAccessPolicy");

            migrationBuilder.DropTable(
                name: "DocumentVersion");

            migrationBuilder.DropTable(
                name: "ProjectAssignment");

            migrationBuilder.DropTable(
                name: "ProjectParty");

            migrationBuilder.DropTable(
                name: "StorageUsageLedger");

            migrationBuilder.DropTable(
                name: "StorageUsageSummary");

            migrationBuilder.DropTable(
                name: "TenantModuleConfig");

            migrationBuilder.DropTable(
                name: "TenantPlan");

            migrationBuilder.DropTable(
                name: "TenantRelationship");

            migrationBuilder.DropTable(
                name: "Consultant");

            migrationBuilder.DropTable(
                name: "ProjectDocument");

            migrationBuilder.DropTable(
                name: "DocumentFolder");

            migrationBuilder.DropTable(
                name: "Project");

            migrationBuilder.DropTable(
                name: "ProjectCategory");
        }
    }
}
