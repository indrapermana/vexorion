namespace VexorionERP.Models;

public enum ImportJobStatus
{
    Draft = 1,
    Validated = 2,
    FailedValidation = 3,
    Imported = 4,
    ImportFailed = 5
}