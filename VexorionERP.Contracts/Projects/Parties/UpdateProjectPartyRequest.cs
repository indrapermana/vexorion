using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateProjectPartyRequest : CreateProjectPartyRequest, IUpdateLineRequest<ProjectParty>
{
    public bool IsActive { get; set; } = true;
}
