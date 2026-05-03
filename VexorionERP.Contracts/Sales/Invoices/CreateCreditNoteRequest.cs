using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class CreateCreditNoteRequest
{
    /// <summary>
    /// Override the auto-generated credit note number. Leave empty or pass "AUTO" to auto-generate.
    /// </summary>
    [StringLength(50)]
    public string? CreditNoteNumber { get; set; }

    /// <summary>
    /// Optional reason or memo for this credit note.
    /// </summary>
    [StringLength(1000)]
    public string? Notes { get; set; }
}
