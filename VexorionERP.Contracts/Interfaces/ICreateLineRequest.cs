namespace VexorionERP.Contracts;

public interface ICreateLineRequest<TLine> : ICreateInput<TLine>
    where TLine : class
{ }