using System.Text.Json.Serialization;

namespace VexorionERP.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum GeneratedDocumentStatus
{
    Ready = 1,
    Failed = 2,
    Superseded = 3
}
