namespace VexorionERP.Models;

public interface IEntityTraceability
{
    DateTime CreatedAtUtc { get; set; }
    DateTime? UpdatedAtUtc { get; set; }
}

