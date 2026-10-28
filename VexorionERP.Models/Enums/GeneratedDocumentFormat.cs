using System.Text.Json.Serialization;

namespace VexorionERP.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum GeneratedDocumentFormat
{
    Docx = 1,
    Pdf = 2
}
