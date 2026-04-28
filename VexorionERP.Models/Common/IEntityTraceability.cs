namespace VexorionERP.Models;

public interface IEntityTraceability
{
    Guid Id { get; set; }
    DateTime CreatedAtUtc { get; set; }
    DateTime? UpdatedAtUtc { get; set; }
}

