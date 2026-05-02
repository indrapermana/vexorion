namespace VexorionERP.Contracts;

public class PosSessionResponse
{
    public bool CanCheckout { get; set; }
    public bool CanRefund { get; set; }
    public bool CanReprint { get; set; }
    public bool CanCloseShift { get; set; }
}
