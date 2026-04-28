namespace VexorionERP.Contracts;

public interface IUpdateLineRequest<TLine> : IUpdateInput<TLine>
    where TLine : class
{ }