using VexorionERP;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplicationIdentity(builder.Configuration);
builder.Services.AddApplicationAuthorization();
builder.Services.AddMediator();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

await app.InitializeApplicationAsync();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;
