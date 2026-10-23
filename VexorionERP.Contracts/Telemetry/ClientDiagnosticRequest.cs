using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Telemetry;

public sealed class ClientDiagnosticRequest
{
    [Required]
    [RegularExpression("^(main-ui|admin-ui|pos)$")]
    public string Application { get; init; } = string.Empty;

    [Required]
    [RegularExpression("^(api.server-error|api.network-error|runtime.error|operation.failed)$")]
    public string EventName { get; init; } = string.Empty;

    [Range(0, 599)]
    public int? ApiStatus { get; init; }

    [RegularExpression("^[A-Za-z0-9._-]{1,80}$")]
    public string? ApiCode { get; init; }

    [RegularExpression("^[A-Za-z0-9._:-]{1,128}$")]
    public string? ClientTraceId { get; init; }
}
