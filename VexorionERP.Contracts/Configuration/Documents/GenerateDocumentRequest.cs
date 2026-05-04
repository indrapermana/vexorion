using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class GenerateDocumentRequest
{
    public GeneratedDocumentSourceType SourceType { get; set; }
    public Guid SourceEntityId { get; set; }
    public GeneratedDocumentFormat Format { get; set; }
    public bool ForceRegenerate { get; set; }
}
